import paper from '@turbowarp/paper';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import Modes from '../lib/modes';
import {MIXED} from '../helper/style-path';
import ColorStyleProptype from '../lib/color-style-proptype';
import GradientTypes from '../lib/gradient-types';

import {changeFillColor, clearFillGradient, DEFAULT_COLOR} from '../reducers/fill-style';
import {changeStrokeColor, clearStrokeGradient} from '../reducers/stroke-style';
import {changeMode} from '../reducers/modes';
import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';
import {setCursor} from '../reducers/cursor';
import {
    changePolyRoundRadius,
    changePolyRoundCornerStyle,
    changePolyRoundLimitRadius,
    changePolyRoundShowItems,
    setPolyRoundPoints,
    editPolyRoundPoint,
    removePolyRoundPoint,
    triggerPolyRoundAction,
    consumePolyRoundAction
} from '../reducers/poly-round-mode';

import {clearSelection, getSelectedLeafItems} from '../helper/selection';
import PolyRoundTool from '../helper/tools/poly-round-tool';
import PolyRoundModeComponent from '../components/poly-round-mode/poly-round-mode.jsx';

// Optional: GUI-side window-manager (only present when loaded as a Remix Warp
// addon; vanilla scratch-paint won't have this module, so fail gracefully).
let WindowManager = null;
try {
    WindowManager = require('@remixwarp/window-manager').default;
} catch (_e) {
    try {
        // Fallback path used by the bundled RW addon system
        WindowManager = require('../../window-system/window-manager.js').default;
    } catch (_e2) {
        WindowManager = null;
    }
}


class PolyRoundMode extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool',
            'validateColorState',
            'handlePointsChanged',
            'openVertexWindow',
            'closeVertexWindow',
            'renderVertexWindow',
            'onVertexInput',
            'onVertexDelete'
        ]);
    }
    componentDidMount () {
        if (this.props.isPolyRoundModeActive) this.activateTool(this.props);
    }

    openVertexWindow () {
        if (!WindowManager) return;
        if (this._vertexWindow) {
            this.renderVertexWindow();
            this._vertexWindow.show();
            return;
        }
        this._vertexWindow = WindowManager.createWindow({
            id: 'poly-round-vertices',
            title: '顶点坐标',
            width: 300,
            height: 360,
            minWidth: 220,
            minHeight: 240,
            onClose: () => {
                this._vertexWindow = null;
            }
        });
        this.renderVertexWindow();
    }

    closeVertexWindow () {
        if (this._vertexWindow) {
            try { this._vertexWindow.close(); } catch (_e) {}
            this._vertexWindow = null;
        }
    }

    renderVertexWindow () {
        if (!this._vertexWindow) return;
        const pts = (this.props.rawPoints || []).slice();
        const content = document.createElement('div');
        content.className = 'poly-round-vertex-window';
        content.style.cssText = 'padding:12px;overflow:auto;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;color:var(--ui-text-primary,#333);';

        if (pts.length === 0) {
            content.innerHTML = '<div style="color:#888;padding:12px 0;text-align:center;">在画板上点一下开始选点<br/>切换模式或关闭此窗口即提交</div>';
        } else {
            content.innerHTML = '<div style="display:grid;grid-template-columns:auto 1fr 1fr auto;gap:4px 8px;align-items:center;margin-bottom:8px;font-weight:500;">' +
                '<span>#</span><span>X</span><span>Y</span><span></span></div>';
            pts.forEach((p, i) => {
                const row = document.createElement('div');
                row.style.cssText = 'display:grid;grid-template-columns:auto 1fr 1fr auto;gap:4px 8px;align-items:center;margin-bottom:6px;';
                row.innerHTML =
                    `<span style="color:#888;">${i + 1}</span>` +
                    `<input data-idx="${i}" data-axis="x" type="number" step="any" value="${p.x.toFixed(1)}" style="width:100%;box-sizing:border-box;padding:4px 6px;border:1px solid var(--ui-black-transparent,#ccc);border-radius:4px;background:var(--ui-modal-background,#fff);color:inherit;font:inherit;">` +
                    `<input data-idx="${i}" data-axis="y" type="number" step="any" value="${p.y.toFixed(1)}" style="width:100%;box-sizing:border-box;padding:4px 6px;border:1px solid var(--ui-black-transparent,#ccc);border-radius:4px;background:var(--ui-modal-background,#fff);color:inherit;font:inherit;">` +
                    `<button data-idx="${i}" class="del" title="删除此顶点" style="padding:2px 6px;border:none;background:transparent;color:#e64a4a;cursor:pointer;font:inherit;">✕</button>`;
                content.appendChild(row);
            });
            content.addEventListener('input', ev => {
                const t = ev.target;
                if (!t || t.tagName !== 'INPUT') return;
                const idx = parseInt(t.dataset.idx, 10);
                const axis = t.dataset.axis;
                if (!axis) return;
                this.onVertexInput(idx, axis, parseFloat(t.value));
            });
            content.addEventListener('click', ev => {
                const t = ev.target;
                if (!t || !t.classList.contains('del')) return;
                this.onVertexDelete(parseInt(t.dataset.idx, 10));
            });
        }
        try {
            this._vertexWindow.setContent(content);
        } catch (_e) {
            // Fallback: wipe and replace
            const c = this._vertexWindow.contentElement;
            while (c && c.firstChild) c.removeChild(c.firstChild);
            c && c.appendChild(content);
        }
    }

    onVertexInput (index, axis, value) {
        if (!isFinite(value)) return;
        const pts = (this.props.rawPoints || []).slice();
        if (index < 0 || index >= pts.length) return;
        const p = Object.assign({}, pts[index]);
        p[axis] = value;
        this.props.onSetPoint(index, p.x, p.y);
    }

    onVertexDelete (index) {
        this.props.onRemovePoint(index);
        this.renderVertexWindow();
    }
    componentWillReceiveProps (nextProps) {
        if (this.tool) {
            if (nextProps.colorState !== this.props.colorState) {
                this.tool.setColorState(nextProps.colorState);
            }
            if (nextProps.selectedItems !== this.props.selectedItems) {
                this.tool.onSelectionChanged(nextProps.selectedItems);
            }
            if (nextProps.radius !== this.props.radius) {
                this.tool.setRadius(nextProps.radius);
            }
            if (nextProps.cornerStyle !== this.props.cornerStyle) {
                this.tool.setCornerStyle(nextProps.cornerStyle);
            }
            if (nextProps.limitRadius !== this.props.limitRadius) {
                this.tool.setLimitRadius(nextProps.limitRadius);
            }
            if (nextProps.showItems !== this.props.showItems) {
                this.tool.setShowItems(nextProps.showItems);
            }

            // Re-render floating vertex editor whenever raw points change
            const prevPts = this.props.rawPoints || [];
            const nextPts = nextProps.rawPoints || [];
            if (this._vertexWindow && JSON.stringify(prevPts) !== JSON.stringify(nextPts)) {
                this.renderVertexWindow();
            }

            // Imperative actions from toolbar (finish / setPoint / removePoint / clear / addMid)
            const pending = nextProps.pendingAction;
            const prevPending = this.props.pendingAction;
            const tokenChanged = !!(pending && (!prevPending || pending.token !== prevPending.token));
            if (pending && tokenChanged) {
                const name = pending.name;
                if (name === 'clear') this.tool.clear();
                else if (name === 'addMid') {
                    const pts = this.tool.getRawPoints();
                    if (pts.length) {
                        const last = pts[pts.length - 1];
                        const prev = pts[pts.length - 2] || last;
                        this.tool.addPointAt(prev.add(last).divide(2));
                    }
                } else if (name === 'finish') this.tool.finish();
                else if (name === 'setPoint') this.tool.setPointAt(pending.index, pending.x, pending.y);
                else if (name === 'removePoint') this.tool.removePoint(pending.index);
                if (typeof this.props.onConsumeAction === 'function') {
                    this.props.onConsumeAction();
                }
            }
        }

        if (nextProps.isPolyRoundModeActive && !this.props.isPolyRoundModeActive) {
            this.activateTool();
        } else if (!nextProps.isPolyRoundModeActive && this.props.isPolyRoundModeActive) {
            this.deactivateTool();
        }
    }
    componentWillUnmount () {
        if (this.tool) this.deactivateTool();
    }
    activateTool () {
        clearSelection(this.props.clearSelectedItems);
        this.validateColorState();

        if (typeof this.props.radius !== 'number') this.props.onChangeRadius(20);

        this.tool = new PolyRoundTool(
            this.props.setSelectedItems,
            this.props.clearSelectedItems,
            this.props.setCursor,
            this.props.onUpdateImage,
            this.handlePointsChanged
        );
        this.tool.setRadius(this.props.radius);
        this.tool.setCornerStyle(this.props.cornerStyle);
        this.tool.setLimitRadius(this.props.limitRadius);
        this.tool.setShowItems(this.props.showItems);
        this.tool.setColorState(this.props.colorState);
        this.tool.activate();
        // GUI window manager (if present) — show a floating vertex editor
        this.openVertexWindow();
    }
    validateColorState () {
        const {strokeWidth} = this.props.colorState;
        const fillColor1 = this.props.colorState.fillColor.primary;
        let fillColor2 = this.props.colorState.fillColor.secondary;
        let fillGradient = this.props.colorState.fillColor.gradientType;
        const strokeColor1 = this.props.colorState.strokeColor.primary;
        let strokeColor2 = this.props.colorState.strokeColor.secondary;
        let strokeGradient = this.props.colorState.strokeColor.gradientType;

        if (fillColor2 === MIXED) {
            this.props.clearFillGradient(); fillColor2 = null;
            fillGradient = GradientTypes.SOLID;
        }
        if (strokeColor2 === MIXED) {
            this.props.clearStrokeGradient(); strokeColor2 = null;
            strokeGradient = GradientTypes.SOLID;
        }

        const fillColorMissing = fillColor1 === MIXED ||
            (fillGradient === GradientTypes.SOLID && fillColor1 === null) ||
            (fillGradient !== GradientTypes.SOLID && fillColor1 === null && fillColor2 === null);
        const strokeColorMissing = strokeColor1 === MIXED ||
            strokeWidth === null || strokeWidth === 0 ||
            (strokeGradient === GradientTypes.SOLID && strokeColor1 === null) ||
            (strokeGradient !== GradientTypes.SOLID && strokeColor1 === null && strokeColor2 === null);

        if (fillColorMissing && strokeColorMissing) {
            this.props.onChangeFillColor(DEFAULT_COLOR);
            this.props.clearFillGradient();
            this.props.onChangeStrokeColor(null);
            this.props.clearStrokeGradient();
        } else if (fillColorMissing && !strokeColorMissing) {
            this.props.onChangeFillColor(null);
            this.props.clearFillGradient();
        } else if (!fillColorMissing && strokeColorMissing) {
            this.props.onChangeStrokeColor(null);
            this.props.clearStrokeGradient();
        }
    }
    deactivateTool () {
        if (this.tool) {
            this.tool.deactivateTool();
            this.tool.remove();
            this.tool = null;
        }
        this.props.onSyncPoints([]);
        this.closeVertexWindow();
    }

    handlePointsChanged (pts) { this.props.onSyncPoints(pts); }

    render () {
        return (
            <PolyRoundModeComponent
                isSelected={this.props.isPolyRoundModeActive}
                onMouseDown={this.props.handleMouseDown}
            />
        );
    }
}

PolyRoundMode.propTypes = {
    clearFillGradient: PropTypes.func.isRequired,
    clearStrokeGradient: PropTypes.func.isRequired,
    clearSelectedItems: PropTypes.func.isRequired,
    colorState: PropTypes.shape({
        fillColor: ColorStyleProptype,
        strokeColor: ColorStyleProptype,
        strokeWidth: PropTypes.number
    }).isRequired,
    cornerStyle: PropTypes.string.isRequired,
    handleMouseDown: PropTypes.func.isRequired,
    isPolyRoundModeActive: PropTypes.bool.isRequired,
    limitRadius: PropTypes.bool.isRequired,
    onChangeFillColor: PropTypes.func.isRequired,
    onChangeStrokeColor: PropTypes.func.isRequired,
    onChangeRadius: PropTypes.func.isRequired,
    onChangeCornerStyle: PropTypes.func.isRequired,
    onChangeLimitRadius: PropTypes.func.isRequired,
    onChangeShowItems: PropTypes.func.isRequired,
    onSyncPoints: PropTypes.func.isRequired,
    onUpdateImage: PropTypes.func.isRequired,
    pendingAction: PropTypes.shape({token: PropTypes.number, name: PropTypes.string}),
    rawPoints: PropTypes.arrayOf(PropTypes.shape({x: PropTypes.number, y: PropTypes.number})),
    onConsumeAction: PropTypes.func,
    onSetPoint: PropTypes.func.isRequired,
    onRemovePoint: PropTypes.func.isRequired,
    radius: PropTypes.number.isRequired,
    showItems: PropTypes.string.isRequired,
    selectedItems: PropTypes.arrayOf(PropTypes.instanceOf(paper.Item)),
    setCursor: PropTypes.func.isRequired,
    setSelectedItems: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    colorState: state.scratchPaint.color,
    isPolyRoundModeActive: state.scratchPaint.mode === Modes.POLY_ROUND,
    selectedItems: state.scratchPaint.selectedItems,
    radius: state.scratchPaint.polyRoundMode.radius,
    cornerStyle: state.scratchPaint.polyRoundMode.cornerStyle,
    limitRadius: state.scratchPaint.polyRoundMode.limitRadius,
    showItems: state.scratchPaint.polyRoundMode.showItems,
    rawPoints: state.scratchPaint.polyRoundMode.rawPoints,
    pendingAction: state.scratchPaint.polyRoundMode.pendingAction
});
const mapDispatchToProps = dispatch => ({
    clearSelectedItems: () => { dispatch(clearSelectedItems()); },
    clearFillGradient: () => { dispatch(clearFillGradient()); },
    clearStrokeGradient: () => { dispatch(clearStrokeGradient()); },
    setSelectedItems: () => {
        dispatch(setSelectedItems(getSelectedLeafItems(), false /* bitmapMode */));
    },
    setCursor: cursorString => { dispatch(setCursor(cursorString)); },
    handleMouseDown: () => { dispatch(changeMode(Modes.POLY_ROUND)); },
    onChangeFillColor: fillColor => { dispatch(changeFillColor(fillColor)); },
    onChangeStrokeColor: strokeColor => { dispatch(changeStrokeColor(strokeColor)); },
    onChangeRadius: radius => { dispatch(changePolyRoundRadius(radius)); },
    onChangeCornerStyle: cornerStyle => { dispatch(changePolyRoundCornerStyle(cornerStyle)); },
    onChangeLimitRadius: limitRadius => { dispatch(changePolyRoundLimitRadius(limitRadius)); },
    onChangeShowItems: showItems => { dispatch(changePolyRoundShowItems(showItems)); },
    onSyncPoints: points => { dispatch(setPolyRoundPoints(points)); },
    onConsumeAction: () => { dispatch(consumePolyRoundAction()); },
    onSetPoint: (index, x, y) => {
        dispatch(editPolyRoundPoint(index, x, y));
        dispatch(triggerPolyRoundAction('setPoint', {index, x, y}));
    },
    onRemovePoint: index => {
        dispatch(removePolyRoundPoint(index));
        dispatch(triggerPolyRoundAction('removePoint', {index}));
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(PolyRoundMode);
