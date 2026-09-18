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
    setPolyRoundPoints,
    triggerPolyRoundAction,
    consumePolyRoundAction
} from '../reducers/poly-round-mode';

import {clearSelection, getSelectedLeafItems} from '../helper/selection';
import PolyRoundTool from '../helper/tools/poly-round-tool';
import PolyRoundModeComponent from '../components/poly-round-mode/poly-round-mode.jsx';

class PolyRoundMode extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'activateTool',
            'deactivateTool',
            'validateColorState',
            'handlePointsChanged'
        ]);
    }
    componentDidMount () {
        if (this.props.isPolyRoundModeActive) {
            this.activateTool(this.props);
        }
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

            // Handle dispatched toolbar actions
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
                } else if (name === 'finish') {
                    this.tool.finish();
                }
                // Acknowledge so stale values don't replay
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
    shouldComponentUpdate (nextProps) {
        return nextProps.isPolyRoundModeActive !== this.props.isPolyRoundModeActive;
    }
    componentWillUnmount () {
        if (this.tool) {
            this.deactivateTool();
        }
    }
    activateTool () {
        clearSelection(this.props.clearSelectedItems);
        this.validateColorState();

        if (typeof this.props.radius !== 'number') {
            this.props.onChangeRadius(20);
        }

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
        this.tool.setColorState(this.props.colorState);
        this.tool.activate();
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
            this.props.clearFillGradient();
            fillColor2 = null;
            fillGradient = GradientTypes.SOLID;
        }
        if (strokeColor2 === MIXED) {
            this.props.clearStrokeGradient();
            strokeColor2 = null;
            strokeGradient = GradientTypes.SOLID;
        }

        const fillColorMissing = fillColor1 === MIXED ||
            (fillGradient === GradientTypes.SOLID && fillColor1 === null) ||
            (fillGradient !== GradientTypes.SOLID && fillColor1 === null && fillColor2 === null);
        const strokeColorMissing = strokeColor1 === MIXED ||
            strokeWidth === null ||
            strokeWidth === 0 ||
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
    }

    handlePointsChanged (pts) {
        this.props.onSyncPoints(pts);
    }

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
    onSyncPoints: PropTypes.func.isRequired,
    onUpdateImage: PropTypes.func.isRequired,
    pendingAction: PropTypes.shape({token: PropTypes.number, name: PropTypes.string}),
    onConsumeAction: PropTypes.func,
    radius: PropTypes.number.isRequired,
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
    pendingAction: state.scratchPaint.polyRoundMode.pendingAction
});
const mapDispatchToProps = dispatch => ({
    clearSelectedItems: () => {
        dispatch(clearSelectedItems());
    },
    clearFillGradient: () => {
        dispatch(clearFillGradient());
    },
    clearStrokeGradient: () => {
        dispatch(clearStrokeGradient());
    },
    setSelectedItems: () => {
        dispatch(setSelectedItems(getSelectedLeafItems(), false /* bitmapMode */));
    },
    setCursor: cursorString => {
        dispatch(setCursor(cursorString));
    },
    handleMouseDown: () => {
        dispatch(changeMode(Modes.POLY_ROUND));
    },
    onChangeFillColor: fillColor => {
        dispatch(changeFillColor(fillColor));
    },
    onChangeStrokeColor: strokeColor => {
        dispatch(changeStrokeColor(strokeColor));
    },
    onChangeRadius: radius => {
        dispatch(changePolyRoundRadius(radius));
    },
    onChangeCornerStyle: cornerStyle => {
        dispatch(changePolyRoundCornerStyle(cornerStyle));
    },
    onChangeLimitRadius: limitRadius => {
        dispatch(changePolyRoundLimitRadius(limitRadius));
    },
    onSyncPoints: points => {
        dispatch(setPolyRoundPoints(points));
    },
    onConsumeAction: () => {
        dispatch(consumePolyRoundAction());
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(PolyRoundMode);
