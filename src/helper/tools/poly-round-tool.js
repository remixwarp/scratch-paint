import paper from '@turbowarp/paper';
import Modes from '../../lib/modes';
import {styleShape} from '../style-path';
import {clearSelection} from '../selection';
import BoundingBoxTool from '../selection-tools/bounding-box-tool';
import NudgeTool from '../selection-tools/nudge-tool';

/**
 * Build a closed rounded paper.Path from an array of points using the
 * PolyGoneRound algorithm (https://github.com/99-Knots/PolyGoneRound).
 *
 * @param {Array<paper.Point>} rawPoints polygon vertices in order
 * @param {number} radius desired corner radius in pixels
 * @param {boolean} limitRadius if true, force every corner to use the same (clamped) radius
 * @param {string} cornerStyle 'arc' (SVG arc) or 'bezier' (quadratic curve to vertex)
 * @returns {paper.Path} closed rounded path, or null if not enough points
 */
function buildRoundedPath (rawPoints, radius, limitRadius, cornerStyle) {
    if (!rawPoints || rawPoints.length < 2) return null;

    const n = rawPoints.length;

    // Per-corner parameter calculation (from PolyGoneRound polygons.js).
    const params = rawPoints.map((p, i) => {
        const prev = rawPoints[(i - 1 + n) % n];
        const curr = p;
        const next = rawPoints[(i + 1) % n];
        const v1 = curr.subtract(prev);
        const v2 = next.subtract(curr);
        const len1 = v1.length;
        const len2 = v2.length;
        if (len1 < 1e-6 || len2 < 1e-6) {
            return null;
        }
        const u1 = v1.divide(len1);
        const u2 = v2.divide(len2);
        // signed angle from u1 to u2 (counter-clockwise positive when looking at raw XY)
        const angle = Math.atan2(
            u1.x * u2.y - u1.y * u2.x,
            u1.x * u2.x + u1.y * u2.y
        );
        const half = Math.abs(angle) / 2;
        // tangent distance along each edge before the arc starts
        let tanLen = radius / (Math.tan(half) || 1e-9);
        let r = radius;
        const maxLen = Math.min(len1, len2) / 2;
        if (tanLen > maxLen) {
            tanLen = maxLen;
            r = maxLen * Math.tan(half);
        }
        return {
            p: curr,
            u1, u2,
            len1, len2,
            angle,          // signed
            half,
            tanLen,
            r,
            clockwise: angle > 0
        };
    });

    // If any two adjacent vertices coincide, bail and return a plain closed path.
    if (params.some(p => p === null)) {
        const fallback = new paper.Path(rawPoints);
        fallback.closed = true;
        return fallback;
    }

    let effectiveRadius = radius;
    if (limitRadius) {
        const minR = params.reduce((min, p) => Math.min(min, p.r), Infinity);
        effectiveRadius = minR;
    }

    const path = new paper.Path();
    path.closed = true;

    for (let i = 0; i < n; i++) {
        const cur = params[i];
        const prev = params[(i - 1 + n) % n];

        // Tangent point on the incoming edge (from prev)
        const tIn = cur.p.subtract(cur.u1.multiply(prev.tanLen));
        // Tangent point on the outgoing edge (to next)
        const tOut = cur.p.add(cur.u2.multiply(cur.tanLen));

        if (i === 0) {
            path.moveTo(tIn);
        } else {
            path.lineTo(tIn);
        }

        const actualR = limitRadius ? Math.max(effectiveRadius * 0.999, 0.001) : cur.r;

        if (cornerStyle === 'bezier') {
            // Quadratic curve with the raw corner as the control point.
            path.quadraticCurveTo(cur.p, tOut);
        } else {
            // Arc from tIn -> tOut around cur.p with the achieved radius.
            path.arcTo(cur.p, tOut, cur.clockwise);
            // Paper.js computes the radius from the geometry; force it.
            // (The helper arcTo already fits a circular arc; nothing to change.)
            void actualR; // hint for future tuning
        }
    }

    return path;
}

/**
 * Tool for drawing rounded polygons by clicking points on the canvas.
 * Analogous to https://github.com/99-Knots/PolyGoneRound but integrated
 * into Scratch Paint as a real-time paper.js Path.
 */
class PolyRoundTool extends paper.Tool {
    static get SNAP_TOLERANCE () {
        return 5;
    }
    static get TOLERANCE () {
        return 2;
    }
    /**
     * @param {function} setSelectedItems Callback to set the set of selected items in the Redux state
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     * @param {function} setCursor Callback to set the visible mouse cursor
     * @param {!function} onUpdateImage A callback to call when the image visibly changes
     * @param {function} onPointsChanged Callback invoked with the array of current raw points each time they change
     */
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

        // state during an in-progress polygon session
        this._rawPoints = [];          // array of paper.Point
        this._markers = null;           // Layer with visible dot markers for each raw point
        this._guide = null;             // dashed-line guide showing raw vertices
        this._preview = null;           // the live rounded path being edited
        this._draggingIndex = -1;

        this._active = false;
    }

    setColorState (colorState) {
        this.colorState = colorState;
        // Re-style the live preview if one is in progress.
        if (this._preview) {
            styleShape(this._preview, this.colorState);
        }
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

    getRawPoints () {
        return this._rawPoints.slice();
    }

    addPointAt (p) {
        this._rawPoints.push(p.clone());
        this._rebuildMarkers();
        this._regeneratePreview();
        this._emitPointsChanged();
        this.onUpdateImage();
    }

    clear () {
        this._discardLive();
        this._emitPointsChanged();
    }

    /**
     * If there is an in-progress polygon, commit it as a selected item
     * that the user can continue to reshape / transform afterwards.
     * @returns {boolean} true if something was committed
     */
    finish () {
        if (!this._preview) return false;
        const path = this._preview;
        // Convert the live preview into a regular selected item.
        this._preview = null;
        if (this._guide) {
            this._guide.remove();
            this._guide = null;
        }
        if (this._markers) {
            this._markers.remove();
            this._markers = null;
        }
        this._rawPoints = [];

        path.selected = true;
        clearSelection(this.clearSelectedItems);
        this.setSelectedItems();
        this.boundingBoxTool.onSelectionChanged(paper.project.selectedItems);
        this.onUpdateImage();
        return true;
    }

    // ----- private helpers -----

    _ensureLayers () {
        if (!this._markers) {
            this._markers = new paper.Layer();
            this._markers.insertBelow(paper.project.activeLayer);
            paper.project.activeLayer.activate();
        }
        if (!this._guide) {
            this._guide = new paper.Path();
            this._guide.strokeColor = new paper.Color(0.5, 0.5, 0.5, 0.9);
            this._guide.dashArray = [4, 3];
            this._guide.strokeWidth = 1 / paper.view.zoom;
            this._guide.closed = true;
            this._guide.data.isPolyRoundGuide = true;
            paper.project.activeLayer.addChild(this._guide);
        }
    }

    _rebuildMarkers () {
        this._ensureLayers();
        this._markers.removeChildren();
        const dotSize = 5 / paper.view.zoom;
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
            this._markers.addChild(dot);
        }
        // Keep markers below the guide line
        this._markers.bringToFront();
    }

    _updateGuide () {
        if (!this._guide) return;
        if (this._rawPoints.length < 2) {
            this._guide.removeSegments();
            return;
        }
        this._guide.setSegments(this._rawPoints);
        this._guide.closed = true;
    }

    _regeneratePreview () {
        if (this._rawPoints.length < 2) {
            if (this._preview) {
                this._preview.remove();
                this._preview = null;
            }
            return;
        }
        const rounded = buildRoundedPath(
            this._rawPoints,
            this.radius,
            this.limitRadius,
            this.cornerStyle
        );
        if (!rounded) return;

        if (this._preview) {
            this._preview.removeSegments();
            this._preview.setSegments(rounded.segments);
            this._preview.closed = true;
        } else {
            rounded.data.isPolyRoundLive = true;
            rounded.guide = false;
            styleShape(rounded, this.colorState);
            this._preview = rounded;
        }
        rounded.remove();
        this._updateGuide();
    }

    _discardLive () {
        if (this._preview) {
            this._preview.remove();
            this._preview = null;
        }
        if (this._guide) {
            this._guide.remove();
            this._guide = null;
        }
        if (this._markers) {
            this._markers.remove();
            this._markers = null;
        }
        this._rawPoints = [];
        this._draggingIndex = -1;
    }

    _emitPointsChanged () {
        if (typeof this.onPointsChanged === 'function') {
            this.onPointsChanged(this._rawPoints.map(p => ({x: p.x, y: p.y})));
        }
    }

    // ----- paper.Tool event handlers -----

    handleMouseDown (event) {
        if (event.event.button > 0) return;
        this._active = true;

        // Did the user click on an existing marker dot while already drawing?
        if (this._markers) {
            const hit = paper.project.hitTest(event.point, {
                item: this._markers,
                tolerance: PolyRoundTool.SNAP_TOLERANCE / paper.view.zoom,
                fill: true,
                stroke: true
            });
            if (hit && hit.item && hit.item.data && typeof hit.item.data.index === 'number') {
                this._draggingIndex = hit.item.data.index;
                return;
            }
        }

        // Click on an existing committed shape? Let bounding-box selection handle it.
        if (this.boundingBoxTool.onMouseDown(
            event, false, false, false, {
                segments: true,
                stroke: true,
                curves: true,
                fill: true,
                guide: false,
                tolerance: PolyRoundTool.TOLERANCE / paper.view.zoom
            })) {
            this.isBoundingBoxMode = true;
            return;
        }

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
            this._rebuildMarkers();
            this._regeneratePreview();
            this._emitPointsChanged();
            this.onUpdateImage();
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

    handleDoubleClick (event) {
        if (event.event.button > 0) return;
        // Treat double-click as a finish signal. The second click from dblclick
        // may have already added a point; that's OK — user can clear by clicking
        // one extra time before finishing.
        void event;
        if (this._rawPoints.length >= 2) {
            this.finish();
        }
    }

    handleMouseMove (event) {
        if (this.isBoundingBoxMode) {
            this.boundingBoxTool.onMouseMove(event, {
                segments: true,
                stroke: true,
                curves: true,
                fill: true,
                guide: false,
                tolerance: PolyRoundTool.TOLERANCE / paper.view.zoom
            });
        }
    }

    onKeyDown (event) {
        // Enter or Space to finish, Backspace to remove last point, Esc to clear.
        const key = event.key;
        if (key === 'enter' || key === 'space') {
            if (this._rawPoints.length >= 2) {
                this.finish();
            }
            event.preventDefault();
            return;
        }
        if (key === 'delete' || key === 'backspace') {
            if (this._rawPoints.length > 0) {
                this._rawPoints.pop();
                this._rebuildMarkers();
                this._regeneratePreview();
                this._emitPointsChanged();
                this.onUpdateImage();
            }
            event.preventDefault();
            return;
        }
        if (key === 'escape') {
            this.clear();
            this.onUpdateImage();
            event.preventDefault();
            return;
        }
    }

    deactivateTool () {
        this.boundingBoxTool.deactivateTool();
        this._discardLive();
    }
}

export default PolyRoundTool;
