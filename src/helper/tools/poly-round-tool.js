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
 * This port is mathematically identical to PolyGoneRound:
 *   - For each vertex compute unit vectors v1 (prev→cur) and v2 (cur→next)
 *   - Compute inner angle θ and clamp tangent distance l so neither edge
 *     loses more than half its length
 *   - tangent point on edge-in  = p − v1 * l
 *   - tangent point on edge-out = p + v2 * l
 *   - Use SVG arc (sweep=1 when inner angle < π, sweep=0 when > π) with
 *     the computed corner radius
 *
 * @param {Array<paper.Point>} rawPoints polygon vertices in order
 * @param {number} radius desired corner radius in pixels (0 = straight corner)
 * @param {boolean} limitRadius if true, every corner uses the same (minimal) radius
 * @param {string} cornerStyle 'arc' (SVG arc) or 'bezier' (quadratic curve through vertex)
 * @returns {?paper.Path} closed rounded path, or null if not enough points
 */
function buildRoundedPath (rawPoints, radius, limitRadius, cornerStyle) {
    if (!rawPoints || rawPoints.length < 2) return null;
    if (rawPoints.length === 2) {
        // Two vertices → straight line between them
        const line = new paper.Path(rawPoints);
        line.closed = false;
        return line;
    }

    const n = rawPoints.length;

    // Step 1 — per-vertex parameters (same as PolyGoneRound._getPointParameters)
    const params = rawPoints.map((p, i) => {
        const prev = rawPoints[(i - 1 + n) % n];
        const next = rawPoints[(i + 1) % n];

        // v1 = from prev to p; v2 = from p to next
        const v1 = new paper.Point(p.x - prev.x, p.y - prev.y);
        const v2 = new paper.Point(next.x - p.x, next.y - p.y);

        const len1 = v1.length;
        const len2 = v2.length;
        if (len1 < 1e-4 || len2 < 1e-4) return null;

        const u1 = v1.normalize();
        const u2 = v2.normalize();

        // tail-tail angle (atan2(v2) − atan2(v1)), PolyGoneRound line
        let angle = Math.atan2(v2.y, v2.x) - Math.atan2(v1.y, v1.x);
        // tip-tail inner angle, wrap into [0, 2π)
        angle = Math.PI - angle;
        angle = (angle + 2 * Math.PI) % (2 * Math.PI);
        // sweep=1 means CW (SVG convention), 0 means CCW
        const sweep = angle > Math.PI ? 0 : 1;

        // tangent distance along each edge
        let l = radius / Math.abs(Math.tan(angle / 2 || 1e-9));
        let r = radius;

        // Clamp l to half of the shorter edge → also clamps r
        const half = Math.min(len1, len2) / 2;
        if (l > half) {
            l = half;
            r = half * Math.abs(Math.tan(angle / 2 || 1e-9));
        }

        return {p, u1, u2, angle, sweep, r, l, len1, len2};
    });

    if (params.some(x => x === null)) {
        const fallback = new paper.Path(rawPoints);
        fallback.closed = true;
        return fallback;
    }

    // Step 2 — if limitRadius, use minimum radius everywhere
    if (limitRadius) {
        const minR = params.reduce((m, p) => Math.min(m, p.r), Infinity);
        for (const p of params) {
            p.r = minR;
            p.l = minR / Math.abs(Math.tan(p.angle / 2 || 1e-9));
            // Re-clamp l just in case
            const half = Math.min(p.len1, p.len2) / 2;
            if (p.l > half) p.l = half;
        }
    }

    // Step 3 — build path by constructing an SVG d-string and importing it.
    // Paper.js's native Path.arc / Path.arcTo have quirks (arcTo uses Canvas-2D
    // semantics with a corner point and no direct sweep control). Using an SVG
    // arc A command gives us perfect 1:1 match with PolyGoneRound.
    let d = '';
    for (let i = 0; i < n; i++) {
        const cur = params[i];

        const tIn = cur.p.subtract(cur.u1.multiply(cur.l));
        const tOut = cur.p.add(cur.u2.multiply(cur.l));

        if (i === 0) {
            d += `M ${tIn.x} ${tIn.y}`;
        } else {
            d += ` L ${tIn.x} ${tIn.y}`;
        }

        if (cornerStyle === 'bezier') {
            // Quadratic curve through the vertex — matches PolyGoneRound Q command
            d += ` Q ${cur.p.x} ${cur.p.y} ${tOut.x} ${tOut.y}`;
        } else {
            // SVG arc. largeArc is always 0 because our sweep is always
            // < π inner angle (we use clamp so r never exceeds half-edge).
            // r can be 0 for straight corners — emit a line instead.
            if (cur.r > 1e-4) {
                d += ` A ${cur.r} ${cur.r} 0 0 ${cur.sweep} ${tOut.x} ${tOut.y}`;
            } else {
                d += ` L ${tOut.x} ${tOut.y}`;
            }
        }
    }
    d += ' Z';

    const path = new paper.Path(d);
    path.closed = true;
    return path;
}


/**
 * Rounded polygon tool — click points, optionally drag markers,
 * finish on double-click / Enter / Escape / tool-switch.
 *
 * All live items go on project.activeLayer with data flags so we can
 * hide / transform them. onUpdateImage fires ONLY at finish so the
 * undo stack stays compact.
 */
class PolyRoundTool extends paper.Tool {
    static get SNAP_TOLERANCE () {
        // Tolerance (in CSS pixels) used to decide "did the user just
        // tap/click on an existing marker?" On touch devices the finger
        // pad is ~40px wide so 18 CSS px is required to actually hit it.
        return 18;
    }
    static get TOLERANCE () {
        return 2;
    }
    constructor (setSelectedItems, clearSelectedItems, setCursor, onUpdateImage, onPointsChanged) {
        super();
        this.setSelectedItems = setSelectedItems;
        this.clearSelectedItems = clearSelectedItems;
        this.onUpdateImage = onUpdateImage;
        this.onPointsChanged = onPointsChanged || (() => {});

        this.boundingBoxTool = new BoundingBoxTool(
            Modes.POLY_ROUND,
            setSelectedItems,
            clearSelectedItems,
            setCursor,
            onUpdateImage
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
        this.showItems = 'both'; // 'both' | 'markers' | 'guide' | 'none'

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
    setRadius (r) {
        this.radius = Math.max(0, r);
        this._regeneratePreview();
    }
    setCornerStyle (style) {
        this.cornerStyle = style;
        this._regeneratePreview();
    }
    setLimitRadius (b) {
        this.limitRadius = !!b;
        this._regeneratePreview();
    }
    setShowItems (showItems) {
        this.showItems = showItems;
        this._applyVisibility();
    }

    onSelectionChanged (selectedItems) {
        if (this.boundingBoxTool) this.boundingBoxTool.onSelectionChanged(selectedItems);
    }
    getHitOptions () {
        return {
            segments: true,
            strokes: true,
            handles: true,
            fill: true,
            tolerance: PolyRoundTool.TOLERANCE
        };
    }

    getRawPoints () { return this._rawPoints.slice(); }

    addPointAt (p) {
        this._rawPoints.push(p.clone());
        this._rebuildMarkers();
        this._regeneratePreview();
        this._emitPointsChanged();
    }

    clear () {
        this._discardLive();
        this._emitPointsChanged();
    }

    setPointAt (index, x, y) {
        if (index < 0 || index >= this._rawPoints.length) return;
        const p = this._rawPoints[index];
        p.set(x, y);
        const m = this._markers[index];
        if (m) m.position = p.clone();
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
     * Commit the live rounded shape into the document as a regular selected
     * item, then fire the standard undo pipeline.
     *
     * Order matters: clear paper selection first, THEN select the new path,
     * THEN dispatch Redux's setSelectedItems (which reads paper.selectedItems).
     * The previous buggy order (select → clearSelection → setSelectedItems)
     * wiped out our new path because clearSelection calls project.deselectAll().
     *
     * @returns {boolean} true if something was committed
     */
    finish () {
        if (!this._preview) return false;

        const path = this._preview;
        this._preview = null;

        if (this._guide) { this._guide.remove(); this._guide = null; }
        this._markers.forEach(m => m.remove());
        this._markers = [];
        this._rawPoints = [];

        paper.project.deselectAll();
        delete path.data.isPolyRoundLive;
        path.selected = true;

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
        const dotSize = 6 / paper.view.zoom; // radius in view coords (12px diameter)
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
            // Update in place for stable node identity
            this._preview.removeSegments();
            this._preview.setSegments(rounded.segments);
            this._preview.closed = true;
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

    handleMouseDown (event) {
        if (event.event.button > 0) return;
        this._active = true;

        // 1) Marker hit-test with generous tolerance for touch
        const markerHit = paper.project.hitTest(event.point, {
            tolerance: PolyRoundTool.SNAP_TOLERANCE / paper.view.zoom,
            fill: true,
            stroke: true,
            match: hit => hit.item && hit.item.data && hit.item.data.isPolyRoundMarker
        });
        if (markerHit && markerHit.item && typeof markerHit.item.data.index === 'number') {
            this._draggingIndex = markerHit.item.data.index;
            return;
        }

        // 2) Clicked our own live preview / guide → treat as adding vertex,
        // NOT as bounding-box transform on a committed item.
        const liveHit = paper.project.hitTest(event.point, {
            tolerance: PolyRoundTool.TOLERANCE / paper.view.zoom,
            fill: true, stroke: true, segments: true, curves: true,
            match: hit => hit.item && hit.item.data &&
                (hit.item.data.isPolyRoundLive || hit.item.data.isPolyRoundGuide)
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

        if (this.isBoundingBoxMode) {
            this.boundingBoxTool.onMouseDrag(event);
            return;
        }

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
        if (this.isBoundingBoxMode) {
            this.boundingBoxTool.onMouseUp(event);
            this.isBoundingBoxMode = null;
        }
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
        if (key === 'escape') {
            this.clear();
            event.preventDefault();
            return;
        }
    }

    /**
     * Called when user switches to another tool / mode. Auto-commit the
     * live shape (equivalent to clicking "完成") so it doesn't vanish.
     * If there's nothing meaningful to commit, just clean up.
     */
    deactivateTool () {
        // Prefer finish() so the shape gets committed instead of discarded.
        const hadLive = !!this._preview;
        const hadMarkers = this._rawPoints.length >= 2;
        if (hadLive || hadMarkers) {
            this.finish();
        }
        this.boundingBoxTool.deactivateTool();
        this._discardLive();
    }
}

export default PolyRoundTool;
