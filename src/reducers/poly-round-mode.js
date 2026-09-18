import log from '../log/log';

const CHANGE_POLY_ROUND_RADIUS = 'scratch-paint/poly-round-mode/CHANGE_RADIUS';
const CHANGE_POLY_ROUND_CORNER_STYLE = 'scratch-paint/poly-round-mode/CHANGE_CORNER_STYLE';
const CHANGE_POLY_ROUND_LIMIT_RADIUS = 'scratch-paint/poly-round-mode/CHANGE_LIMIT_RADIUS';
const TOGGLE_POLY_ROUND_COLLAPSE = 'scratch-paint/poly-round-mode/TOGGLE_COLLAPSE';
const SET_POLY_ROUND_POINTS = 'scratch-paint/poly-round-mode/SET_POINTS';
const TRIGGER_POLY_ROUND_ACTION = 'scratch-paint/poly-round-mode/TRIGGER_ACTION';

const initialState = {
    radius: 20,
    cornerStyle: 'arc',
    limitRadius: false,
    collapsePoints: false,
    rawPoints: []
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case CHANGE_POLY_ROUND_RADIUS:
        if (isNaN(action.radius)) {
            log.warn(`Invalid poly-round radius: ${action.radius}`);
            return state;
        }
        return Object.assign({}, state, {radius: Math.max(0, action.radius)});
    case CHANGE_POLY_ROUND_CORNER_STYLE:
        if (action.cornerStyle !== 'arc' && action.cornerStyle !== 'bezier') {
            log.warn(`Invalid poly-round corner style: ${action.cornerStyle}`);
            return state;
        }
        return Object.assign({}, state, {cornerStyle: action.cornerStyle});
    case CHANGE_POLY_ROUND_LIMIT_RADIUS:
        return Object.assign({}, state, {limitRadius: !!action.limitRadius});
    case TOGGLE_POLY_ROUND_COLLAPSE:
        return Object.assign({}, state, {collapsePoints: !state.collapsePoints});
    case SET_POLY_ROUND_POINTS:
        return Object.assign({}, state, {rawPoints: Array.isArray(action.points) ? action.points.slice() : []});
    case TRIGGER_POLY_ROUND_ACTION:
        // Stash the requested action for the tool container to pick up
        return Object.assign({}, state, {pendingAction: action.name});
    default:
        return state;
    }
};

const changePolyRoundRadius = function (radius) {
    return {type: CHANGE_POLY_ROUND_RADIUS, radius};
};
const changePolyRoundCornerStyle = function (cornerStyle) {
    return {type: CHANGE_POLY_ROUND_CORNER_STYLE, cornerStyle};
};
const changePolyRoundLimitRadius = function (limitRadius) {
    return {type: CHANGE_POLY_ROUND_LIMIT_RADIUS, limitRadius};
};
const togglePolyRoundCollapse = function () {
    return {type: TOGGLE_POLY_ROUND_COLLAPSE};
};
const setPolyRoundPoints = function (points) {
    return {type: SET_POLY_ROUND_POINTS, points};
};
const triggerPolyRoundAction = function (name) {
    return {type: TRIGGER_POLY_ROUND_ACTION, name}; // 'clear' | 'addMid' | 'finish'
};

export {
    reducer as default,
    changePolyRoundRadius,
    changePolyRoundCornerStyle,
    changePolyRoundLimitRadius,
    togglePolyRoundCollapse,
    setPolyRoundPoints,
    triggerPolyRoundAction
};
