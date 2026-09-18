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
        const u1 = v1.normalize();
        const u2 = v2.normalize();
        // signed angle from u1 to u2 (CCW positive in paper's standard coord)
        const angle = Math.atan2(
            u1.x * u2.y - u1.y * u2.x,
            u1.x * u2.x + u1.y * u2.y
        );
        const half = Math.abs(angle) / 2;
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

    if (params.some(p => p === null)) {
        const fallback = new paper.Path(rawPoints);
        fallback.closed = true;
        return fallback;
    }

    if (limitRadius) {
        const minR = params.reduce((min, p) => Math.min(min, p.r), Infinity);
        for (let i = 0; i < params.length; i++) {
            params[i].r = minR;
            const tan = minR / (Math.tan(params[i].half) || 1e-9);
            params[i].tanLen = Math.min(tan, Math.min(params[i].len1, params[i].len2) / 2);
        }
    }

    const path = new paper.Path();
    path.closed = true;

    for (let i = 0; i < n; i++) {
        const cur = params[i];

        const tIn = cur.p.subtract(cur.u1.multiply(cur.tanLen));
        const tOut = cur.p.add(cur.u2.multiply(cur.tanLen));

        if (i === 0) {
            path.moveTo(tIn);
        } else {
            path.lineTo(tIn);
        }

        if (cornerStyle === 'bezier') {
            path.quadraticCurveTo(cur.p, tOut);
        } else {
            path.arcTo(cur.p, tOut, cur.clockwise);
        }
    }

    return path;
}

/**
 * Tool for drawing rounded polygons by clicking points on the canvas.
 * Analogous to https://github.com/99-Knots/PolyGoneRound but integrated
 * into Scratch Paint as a real-time paper.js Path.
 *
 * Convention (shared with rounded-rect-tool / triangle-tool / etc.):
 *   - Live preview is drawn with paper.js directly (no onUpdateImage)
 *   - onUpdateImage is called *only* when a shape is FINISHED / committed,
 *     so scratch-paint's undo reducer snapshots the final shape.
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

        // in-progress polygon state (all live items go on project.activeLayer
        // with data.isPolyRoundLive / data.isPolyRoundGuide / data.isPolyRoundMarker
        // so paper renders them immediately; we only commit undo on finish()).
        this._rawPoints = [];
        this._markers = [];   // array of paper.Path.Circle / rect markers
        this._guide = null;   // dashed closed Path of raw vertices
        this._preview = null; // live rounded preview Path
        this._draggingIndex = -1;
        this._active = false;
    }

    setColorState (colorState) {
        this.colorState = colorState;
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
        // NOTE: intentionally NOT calling onUpdateImage here — live editing
        // is paper-only; onUpdateImage fires only on finish/clear so the
        // undo stack stays compact.
    }

    clear () {
        this._discardLive();
        this._emitPointsChanged();
        // Clear only matters if we had something to erase — but we don't know
        // if the user had committed anything. Since clear() only touches the
        // live preview (which never makes it into undo), we don't need to call
        // onUpdateImage here. Commit-time calls will happen when needed.
    }

    /**
     * Commit the live rounded shape into the document as a regular selected
     * item, then let the usual undo pipeline record it.
     * @returns {boolean} true if something was committed
     */
    finish () {
        if (!this._preview) return false;
        const path = this._preview;
        this._preview = null;

        if (this._guide) {
            this._guide.remove();
            this._guide = null;
        }
        this._markers.forEach(m => m.remove());
        this._markers = [];
        this._rawPoints = [];

        // Strip our internal marker flag so this becomes a normal path.
        delete path.data.isPolyRoundLive;
        path.selected = true;

        clearSelection(this.clearSelectedItems);
        this.setSelectedItems();
        this.boundingBoxTool.onSelectionChanged(paper.project.selectedItems);
        this.onUpdateImage();
        return true;
    }

    // ----- private helpers -----

    _rebuildMarkers () {
        // Clear existing
        this._markers.forEach(m => m.remove());
        this._markers = [];
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
            this._markers.push(dot);
        }
    }

    _ensureGuide () {
        if (this._guide) return;
        this._guide = new paper.Path();
        this._guide.strokeColor = new paper.Color(0.5, 0.5, 0.5, 0.9);
        this._guide.dashArray = [4, 3];
        this._guide.strokeWidth = 1 / paper.view.zoom;
        this._guide.closed = true;
        this._guide.data.isPolyRoundGuide = true;
    }

    _regeneratePreview () {
        if (this._rawPoints.length < 2) {
            if (this._preview) {
                this._preview.remove();
                this._preview = null;
            }
            if (this._guide) {
                this._guide.removeSegments();
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
            // Update in place to keep node identity stable.
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

        this._ensureGuide();
        this._guide.removeSegments();
        this._guide.setSegments(this._rawPoints);
        this._guide.closed = true;
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

    // ----- paper.Tool event handlers -----

    handleMouseDown (event) {
        if (event.event.button > 0) return;
        this._active = true;

        // Clicking on an existing marker while editing → start dragging it.
        // Markers are regular Path items on activeLayer (data.isPolyRoundMarker).
        const hit = paper.project.hitTest(event.point, {
            tolerance: PolyRoundTool.SNAP_TOLERANCE / paper.view.zoom,
            fill: true,
            stroke: true,
            match: hitResult => hitResult.item && hitResult.item.data && hitResult.item.data.isPolyRoundMarker
        });
        if (hit && hit.item && typeof hit.item.data.index === 'number') {
            this._draggingIndex = hit.item.data.index;
            return;
        }

        // Try bounding-box selection on an already-committed item.
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
            // Move the matching marker too.
            const m = this._markers[this._draggingIndex];
            if (m) m.position = event.point;
            this._regeneratePreview();
            this._emitPointsChanged();
            // Intentionally no onUpdateImage — still live editing.
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
        // Treat double-click as finish signal (the first click of the dblclick
        // may have already added a point — user can undo if needed).
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
                // Remove marker from canvas as well
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

    deactivateTool () {
        this.boundingBoxTool.deactivateTool();
        this._discardLive();
    }
}

export default PolyRoundTool;
