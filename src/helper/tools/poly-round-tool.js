import paper from '@turbowarp/paper';
import Modes from '../../lib/modes';
import {styleShape} from '../style-path';
import {clearSelection} from '../selection';
import BoundingBoxTool from '../selection-tools/bounding-box-tool';
import NudgeTool from '../selection-tools/nudge-tool';

/**
 * Build a closed rounded paper.Path from an array of raw polygon vertices
 * using the PolyGoneRound algorithm (https://github.com/99-Knots/PolyGoneRound).
 *
 * We construct the path directly through paper's segment API — NO SVG
 * d-string parsing — so the result is always a single flat paper.Path
 * with no CompoundPath children, no ghost items, and no invisible pieces.
 *
 * Per-vertex math (identical to PolyGoneRound._getPointParameters):
 *   v1 = p - prev,  v2 = next - p   (raw edge vectors)
 *   angle = (π - ((atan2(v2) − atan2(v1)) wrapped to [0, 2π))) — inner angle
 *   sweep = angle > π ? 0 : 1       (SVG/paper sweep convention)
 *   tan distance  = radius / |tan(angle/2)|, clamped to half the shorter edge
 *   tangent-in  point  = p − u1 * l
 *   tangent-out point  = p + u2 * l
 *
 * @param {Array<paper.Point>} rawPoints polygon vertices in order
 * @param {number} radius desired corner radius in pixels (0 = straight corner)
 * @param {boolean} limitRadius if true, every corner uses the same (minimal) radius
 * @param {string} cornerStyle 'arc' (rounded corner) or 'bezier' (quadratic through vertex)
 * @returns {?paper.Path} closed rounded path, single flat Path, or null if degenerate
 */
function buildRoundedPath (rawPoints, radius, limitRadius, cornerStyle) {
    if (!rawPoints || rawPoints.length < 2) return null;

    // 2 vertices — just an open line between them, no rounding
    if (rawPoints.length === 2) {
        return new paper.Path({segments: rawPoints, closed: false});
    }

    const n = rawPoints.length;

    // Per-vertex parameters
    const params = rawPoints.map((p, i) => {
        const prev = rawPoints[(i - 1 + n) % n];
        const next = rawPoints[(i + 1) % n];

        const v1 = new paper.Point(p.x - prev.x, p.y - prev.y);
        const v2 = new paper.Point(next.x - p.x, next.y - p.y);
        const len1 = v1.length;
        const len2 = v2.length;
        if (len1 < 1e-4 || len2 < 1e-4) return null;

        const u1 = v1.normalize();
        const u2 = v2.normalize();

        // Same angle math as PolyGoneRound
        let angle = Math.atan2(v2.y, v2.x) - Math.atan2(v1.y, v1.x);
        angle = Math.PI - angle;
        angle = (angle + 2 * Math.PI) % (2 * Math.PI);
        // sweepSign: +1 for convex (angle <= PI), -1 for concave (angle > PI).
        // Controls which direction the corner "bulges" along the normal bisector.
        const sweepSign = angle <= Math.PI ? 1 : -1;

        let l = radius / Math.abs(Math.tan(angle / 2 || 1e-9));
        let r = radius;
        const half = Math.min(len1, len2) / 2;
        if (l > half) {
            l = half;
            r = half * Math.abs(Math.tan(angle / 2 || 1e-9));
        }

        return {p, u1, u2, angle, sweepSign, r, l, len1, len2};
    });

    // Degenerate fallback (coincident vertices) — straight polygon
    if (params.some(x => x === null)) {
        return new paper.Path({segments: rawPoints, closed: true});
    }

    // Uniform radius across all corners if requested
    if (limitRadius) {
        const minR = params.reduce((m, p) => Math.min(m, p.r), Infinity);
        for (const p of params) {
            p.r = minR;
            p.l = minR / Math.abs(Math.tan(p.angle / 2 || 1e-9));
            const half = Math.min(p.len1, p.len2) / 2;
            if (p.l > half) p.l = half;
        }
    }

    // Now build the path step by step — ONE flat paper.Path, NO CompoundPath children.
    const path = new paper.Path();
    path.moveTo(params[0].p.subtract(params[0].u1.multiply(params[0].l)));

    for (let i = 0; i < n; i++) {
        const cur = params[i];

        // Starting tangent point (line-to target)
        if (i > 0) {
            path.lineTo(cur.p.subtract(cur.u1.multiply(cur.l)));
        }

        // Ending tangent point (arc/bezier lands here)
        const tOut = cur.p.add(cur.u2.multiply(cur.l));

        // Turbowarp's paper.js arcTo has unreliable clockwise semantics;
        // arc corners are implemented with a cubic Bezier approximation
        // of a circular arc, which matches PolyGoneRound's SVG 'A r r' output.
        // The quadratic variant is PolyGoneRound's original bezier style.
        if (cur.r > 1e-4 && cur.l > 1e-4) {
            if (cornerStyle === 'bezier') {
                // PolyGoneRound bezier: Q vertex, tOut  (single quadratic)
                path.quadraticCurveTo(cur.p, tOut);
            } else {
                // Cubic approximation of a circular arc from tIn to tOut
                // passing distance r from cur.p along the bisector.
                //
                // Construction:
                //   normal      = rotate(tOut - tIn) by sweepSign * 90°
                //                 (points into the polygon interior for convex,
                //                  outward for concave — flips bulge direction)
                //   center      = midpoint(tIn,tOut) + normal * r
                //   control pts = start - (start-center)*k  ...  where k = 4/3*tan(arcAngle/4)
                //   end         = tOut
                //
                // For a right-angle arc (angle = PI/2), k = 4/3*tan(PI/8) ≈ 0.5522.
                const tIn = cur.p.subtract(cur.u1.multiply(cur.l));
                const delta = tOut.subtract(tIn);
                const mid = tIn.add(delta.divide(2));
                // normal pointing perpendicular to (tOut - tIn), sign flips
                // so convex corners bulge INTO the polygon
                const normal = new paper.Point(-delta.y, delta.x).multiply(cur.sweepSign);
                const normalLen = normal.length || 1;
                const unitNormal = normal.normalize();
                const center = mid.add(unitNormal.multiply(cur.r));

                // arc from start to end around center; sweep angle = 2*(angle/2) = angle
                // We use absolute r; actual arc angular span is angle (both for convex and concave,
                // but direction is encoded by sweepSign which also normal-flips the normal).
                const startToCenter = tIn.subtract(center);
                const endToCenter   = tOut.subtract(center);

                // k = 4/3 * tan(theta/4) where theta = 2 * angle/2 = angle
                const theta = cur.angle;
                const k = 4 / 3 * Math.tan(theta / 4 || 1e-9);

                // Control points offset tangentially from start and end
                // tangent at start is (cur.p - tIn) direction (same as u1)
                // tangent at end   is (tOut - cur.p) direction (same as u2)
                // Both point outward from the arc, so we subtract them
                const cp1 = tIn.add(cur.u1.multiply(cur.l * k));
                const cp2 = tOut.subtract(cur.u2.multiply(cur.l * k));

                path.cubicCurveTo(cp1, cp2, tOut);
            }
        } else {
            path.lineTo(tOut);
        }
    }

    path.closePath();
    return path;
}


/**
 * Rounded polygon tool — click points, optionally drag markers,
 * finish on double-click / Enter / Escape / tool-switch.
 *
 * All live items go on project.activeLayer with data flags so we can
 * show/hide them. onUpdateImage fires ONLY at finish so the undo stack
 * stays compact.
 */
class PolyRoundTool extends paper.Tool {
    static get SNAP_TOLERANCE () { return 18; } // generous for touch
    static get TOLERANCE () { return 2; }

    constructor (setSelectedItems, clearSelectedItems, setCursor, onUpdateImage, onPointsChanged) {
        super();
        this.setSelectedItems = setSelectedItems;
        this.clearSelectedItems = clearSelectedItems;
        this.onUpdateImage = onUpdateImage;
        this.onPointsChanged = onPointsChanged || (() => {});

        this.boundingBoxTool = new BoundingBoxTool(
            Modes.POLY_ROUND,
            setSelectedItems, clearSelectedItems, setCursor, onUpdateImage
        );
        const nudgeTool = new NudgeTool(Modes.POLY_ROUND, this.boundingBoxTool, onUpdateImage);

        this.onMouseDown = this.handleMouseDown;
        this.onMouseMove = this.handleMouseMove;
        this.onMouseDrag = this.handleMouseDrag;
        this.onMouseUp = this.handleMouseUp;
        this.onDoubleClick = this.handleDoubleClick;
        this.onKeyUp = nudgeTool.onKeyUp;
        this.onKeyDown = nudgeTool.onKeyDown;

        this.radius = 20;
        this.cornerStyle = 'arc';
        this.limitRadius = false;
        this.showItems = 'both';

        this._rawPoints = [];
        this._markers = [];
        this._guide = null;
        this._preview = null;
        this._draggingIndex = -1;
        this._active = false;
    }

    setColorState (colorState) {
        this.colorState = colorState;
        if (this._preview) styleShape(this._preview, this.colorState);
    }
    setRadius (r) { this.radius = Math.max(0, r); this._regeneratePreview(); }
    setCornerStyle (s) { this.cornerStyle = s; this._regeneratePreview(); }
    setLimitRadius (b) { this.limitRadius = !!b; this._regeneratePreview(); }
    setShowItems (s) { this.showItems = s; this._applyVisibility(); }

    onSelectionChanged (sels) { if (this.boundingBoxTool) this.boundingBoxTool.onSelectionChanged(sels); }
    getHitOptions () {
        return {segments: true, strokes: true, handles: true, fill: true, tolerance: PolyRoundTool.TOLERANCE};
    }

    getRawPoints () { return this._rawPoints.slice(); }

    addPointAt (p) {
        this._rawPoints.push(p.clone());
        this._rebuildMarkers();
        this._regeneratePreview();
        this._emitPointsChanged();
    }

    clear () { this._discardLive(); this._emitPointsChanged(); }

    setPointAt (index, x, y) {
        if (index < 0 || index >= this._rawPoints.length) return;
        this._rawPoints[index].set(x, y);
        const m = this._markers[index];
        if (m) m.position = this._rawPoints[index].clone();
        this._regeneratePreview();
        this._emitPointsChanged();
    }

    removePoint (index) {
        if (index < 0 || index >= this._rawPoints.length) return;
        const marker = this._markers.splice(index, 1)[0];
        if (marker) marker.remove();
        this._rawPoints.splice(index, 1);
        this._markers.forEach((m, i) => { m.data.index = i; });
        this._regeneratePreview();
        this._emitPointsChanged();
    }

    /**
     * Commit the live shape into the document. Only the rounded path
     * survives — markers, guide, and any stray children are gone.
     * Final state: exactly ONE selected paper.Path on the active layer.
     *
     * Order matters (was the cause of "shape not committed" bug):
     *   1. clear paper selection
     *   2. strip live-preview flags + set path.selected = true
     *   3. fire Redux setSelectedItems (reads paper.selectedItems)
     *   4. fire onUpdateImage (snapshots undo)
     */
    finish () {
        if (!this._preview) return false;

        const path = this._preview;
        this._preview = null;

        // Drop guide + markers first
        if (this._guide) { this._guide.remove(); this._guide = null; }
        this._markers.forEach(m => m.remove());
        this._markers = [];
        this._rawPoints = [];

        // Safety: if the path somehow ended up as a CompoundPath
        // (paper sometimes produces them for exotic arc strings),
        // flatten it to a single flat Path so nothing extra shows up.
        let finalPath = path;
        if (path instanceof paper.CompoundPath) {
            // Take the first child — it's always our real shape
            const firstChild = path.children[0];
            if (firstChild) {
                path.remove();
                finalPath = firstChild;
            }
        }
        // Safety-2: remove any children on a Path that shouldn't have them
        if (finalPath.children && finalPath.children.length > 0) {
            finalPath.children.forEach(c => c.remove());
        }

        // Safety-3: ensure it lives on project.activeLayer (not a sub-layer)
        if (finalPath.layer !== paper.project.activeLayer) {
            paper.project.activeLayer.addChild(finalPath);
        }

        paper.project.deselectAll();
        delete finalPath.data.isPolyRoundLive;
        delete finalPath.data.isHelperItem;
        finalPath.selected = true;

        this.setSelectedItems();
        this.boundingBoxTool.onSelectionChanged(paper.project.selectedItems);
        this.onUpdateImage();
        return true;
    }

    // ----- private -----

    _applyVisibility () {
        const s = this.showItems || 'both';
        const showMarkers = s === 'both' || s === 'markers';
        const showGuide = s === 'both' || s === 'guide';
        for (const m of this._markers) m.visible = showMarkers;
        if (this._guide) this._guide.visible = showGuide;
    }

    _rebuildMarkers () {
        this._markers.forEach(m => m.remove());
        this._markers = [];
        const dotSize = 6 / paper.view.zoom; // radius 6 → ~12px diameter
        for (let i = 0; i < this._rawPoints.length; i++) {
            const p = this._rawPoints[i];
            const dot = new paper.Path.Circle({
                center: p,
                radius: dotSize,
                fillColor: new paper.Color(1, 0.3, 0.3, 1),
                strokeColor: new paper.Color(1, 1, 1, 1),
                strokeWidth: 1 / paper.view.zoom
            });
            dot.data.isPolyRoundMarker = true;
            dot.data.index = i;
            this._markers.push(dot);
        }
        this._applyVisibility();
    }

    _ensureGuide () {
        if (this._guide) return;
        this._guide = new paper.Path();
        this._guide.strokeColor = new paper.Color(0.5, 0.5, 0.5, 0.9);
        this._guide.dashArray = [4, 3];
        this._guide.strokeWidth = 1 / paper.view.zoom;
        this._guide.closed = true;
        this._guide.data.isPolyRoundGuide = true;
        this._applyVisibility();
    }

    _regeneratePreview () {
        if (this._rawPoints.length < 2) {
            if (this._preview) { this._preview.remove(); this._preview = null; }
            if (this._guide) this._guide.removeSegments();
            return;
        }
        const rounded = buildRoundedPath(
            this._rawPoints, this.radius, this.limitRadius, this.cornerStyle
        );
        if (!rounded) return;

        if (this._preview) {
            // Update in place for stable node identity — reuse existing item
            this._preview.removeSegments();
            this._preview.setSegments(rounded.segments);
            this._preview.closed = rounded.closed;
            // If the new path turned out to be a CompoundPath somehow,
            // we can't merge segments — just swap it out.
            if (rounded instanceof paper.CompoundPath) {
                rounded.data.isPolyRoundLive = true;
                rounded.guide = false;
                styleShape(rounded, this.colorState);
                this._preview.remove();
                this._preview = rounded;
            }
        } else {
            rounded.data.isPolyRoundLive = true;
            rounded.guide = false;
            styleShape(rounded, this.colorState);
            this._preview = rounded;
        }

        this._ensureGuide();
        this._guide.removeSegments();
        this._guide.setSegments(this._rawPoints);
        this._guide.closed = true;
    }

    _discardLive () {
        if (this._preview) { this._preview.remove(); this._preview = null; }
        if (this._guide) { this._guide.remove(); this._guide = null; }
        this._markers.forEach(m => m.remove());
        this._markers = [];
        this._rawPoints = [];
        this._draggingIndex = -1;
    }

    _emitPointsChanged () {
        if (typeof this.onPointsChanged === 'function') {
            this.onPointsChanged(this._rawPoints.map(p => ({x: p.x, y: p.y})));
        }
    }

    // ----- paper.Tool events -----

    /**
     * Helper: is the DOM element that received the event an interactive
     * form control? If so we MUST ignore it — otherwise every tap on an
     * <input> or <button> would also add a vertex or start a transform.
     */
    _isFormTarget (domEvent) {
        const el = domEvent && domEvent.target;
        if (!el) return false;
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'textarea' || tag === 'button') return true;
        if (el.isContentEditable) return true;
        return false;
    }

    handleMouseDown (event) {
        if (event.event.button > 0) return;
        // NEVER let clicks on toolbar inputs/buttons leak into paper
        if (this._isFormTarget(event.event)) return;

        this._active = true;

        // 1) Marker hit-test — most generous tolerance on mobile
        const markerHit = paper.project.hitTest(event.point, {
            tolerance: PolyRoundTool.SNAP_TOLERANCE / paper.view.zoom,
            fill: true, stroke: true,
            match: h => h.item && h.item.data && h.item.data.isPolyRoundMarker
        });
        if (markerHit && markerHit.item && typeof markerHit.item.data.index === 'number') {
            this._draggingIndex = markerHit.item.data.index;
            return;
        }

        // 2) Click on our live preview / dashed guide → treat as add vertex
        const liveHit = paper.project.hitTest(event.point, {
            tolerance: PolyRoundTool.TOLERANCE / paper.view.zoom,
            fill: true, stroke: true, segments: true, curves: true,
            match: h => {
                const it = h.item;
                if (!it || !it.data) return false;
                // Direct flag check OR any ancestor carrying the flag
                if (it.data.isPolyRoundLive || it.data.isPolyRoundGuide) return true;
                return false;
            }
        });
        if (liveHit) {
            clearSelection(this.clearSelectedItems);
            this.isBoundingBoxMode = false;
            this.addPointAt(event.point);
            return;
        }

        // 3) Bounding-box transform on a committed item from earlier
        if (this.boundingBoxTool.onMouseDown(
            event, false, false, false, {
                segments: true, stroke: true, curves: true, fill: true,
                guide: false,
                match: hit => {
                    const it = hit.item;
                    if (!it || !it.data) return true;
                    // Never try to bound-box our own live items — even if they
                    // somehow didn't match step #2 above
                    if (it.data.isPolyRoundLive || it.data.isPolyRoundGuide) return false;
                    if (it.data.isPolyRoundMarker) return false;
                    return true;
                },
                tolerance: PolyRoundTool.TOLERANCE / paper.view.zoom
            })) {
            this.isBoundingBoxMode = true;
            return;
        }

        // 4) Add new vertex
        clearSelection(this.clearSelectedItems);
        this.isBoundingBoxMode = false;
        this.addPointAt(event.point);
    }

    handleMouseDrag (event) {
        if (event.event.button > 0 || !this._active) return;
        if (this.isBoundingBoxMode) { this.boundingBoxTool.onMouseDrag(event); return; }
        if (this._draggingIndex >= 0 && this._draggingIndex < this._rawPoints.length) {
            this._rawPoints[this._draggingIndex].set(event.point);
            const m = this._markers[this._draggingIndex];
            if (m) m.position = event.point;
            this._regeneratePreview();
            this._emitPointsChanged();
        }
    }

    handleMouseUp (event) {
        if (event.event.button > 0) return;
        if (this.isBoundingBoxMode) { this.boundingBoxTool.onMouseUp(event); this.isBoundingBoxMode = null; }
        this._draggingIndex = -1;
        this._active = false;
    }

    handleDoubleClick () {
        if (this._rawPoints.length >= 2) this.finish();
    }

    handleMouseMove (event) {
        if (this.isBoundingBoxMode) {
            this.boundingBoxTool.onMouseMove(event, {
                segments: true, stroke: true, curves: true, fill: true,
                guide: false,
                match: hit => {
                    const it = hit.item;
                    if (!it || !it.data) return true;
                    if (it.data.isPolyRoundLive || it.data.isPolyRoundGuide || it.data.isPolyRoundMarker) return false;
                    return true;
                },
                tolerance: PolyRoundTool.TOLERANCE / paper.view.zoom
            });
        }
    }

    onKeyDown (event) {
        const key = event.key;
        if (key === 'enter' || key === 'space') {
            if (this._rawPoints.length >= 2) this.finish();
            event.preventDefault();
            return;
        }
        if (key === 'delete' || key === 'backspace') {
            if (this._rawPoints.length > 0) {
                const removed = this._markers.pop();
                if (removed) removed.remove();
                this._rawPoints.pop();
                this._regeneratePreview();
                this._emitPointsChanged();
            }
            event.preventDefault();
            return;
        }
        if (key === 'escape') { this.clear(); event.preventDefault(); return; }
    }

    /**
     * Tool switch = auto-commit (like clicking "完成").
     * If there's nothing meaningful to commit, just clean up silently.
     */
    deactivateTool () {
        if (this._preview && this._rawPoints.length >= 2) {
            this.finish();
        }
        this.boundingBoxTool.deactivateTool();
        this._discardLive();
    }
}

export default PolyRoundTool;
