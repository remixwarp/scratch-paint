import log from '../log/log';

const CHANGE_POLY_ROUND_RADIUS = 'scratch-paint/poly-round-mode/CHANGE_RADIUS';
const CHANGE_POLY_ROUND_CORNER_STYLE = 'scratch-paint/poly-round-mode/CHANGE_CORNER_STYLE';
const CHANGE_POLY_ROUND_LIMIT_RADIUS = 'scratch-paint/poly-round-mode/CHANGE_LIMIT_RADIUS';
const CHANGE_POLY_ROUND_SHOW_ITEMS = 'scratch-paint/poly-round-mode/CHANGE_SHOW_ITEMS';
const TOGGLE_POLY_ROUND_COLLAPSE = 'scratch-paint/poly-round-mode/TOGGLE_COLLAPSE';
const TOGGLE_POLY_ROUND_AUTO_ORDER = 'scratch-paint/poly-round-mode/TOGGLE_AUTO_ORDER';
const SET_POLY_ROUND_POINTS = 'scratch-paint/poly-round-mode/SET_POINTS';
const EDIT_POLY_ROUND_POINT = 'scratch-paint/poly-round-mode/EDIT_POINT';
const REMOVE_POLY_ROUND_POINT = 'scratch-paint/poly-round-mode/REMOVE_POINT';
const TRIGGER_POLY_ROUND_ACTION = 'scratch-paint/poly-round-mode/TRIGGER_ACTION';
const CONSUME_POLY_ROUND_ACTION = 'scratch-paint/poly-round-mode/CONSUME_ACTION';

let actionCounter = 0;

const initialState = {
    radius: 20,
    cornerStyle: 'arc',
    limitRadius: false,
    showItems: 'both',  // 'both' | 'markers' | 'guide' | 'none'
    collapsePoints: false,
    autoOrder: true,  // auto sort points into simple (non-self-intersecting) order
    rawPoints: [],
    pendingAction: null    // {token, name, ...payload}
};

/**
 * Sort a list of 2D points into a simple (non-self-intersecting)
 * order by polar angle around the centroid. Points that form a
 * convex shape in any input order become a CCW-sorted simple polygon.
 * Points already in CCW/CW order (e.g. user clicked four corners
 * clockwise) keep their effective ordering — we just pick which
 * rotation of that order is the starting index, not the relative
 * cyclic sequence itself.
 *
 * @param {Array<{x:number,y:number}>} pts
 * @returns {Array<{x:number,y:number}>} copy, or original if too few points
 */
function polarSort (pts) {
    if (!pts || pts.length < 3) return pts;
    // centroid
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p.x; cy += p.y; }
    cx /= pts.length; cy /= pts.length;
    // copy and sort by polar angle (atan2 diff)
    const copy = pts.slice();
    copy.sort((a, b) => {
        return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx);
    });
    return copy;
}

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
    case CHANGE_POLY_ROUND_SHOW_ITEMS: {
        const valid = ['both', 'markers', 'guide', 'none'];
        if (!valid.includes(action.showItems)) {
            log.warn(`Invalid poly-round showItems: ${action.showItems}`);
            return state;
        }
        return Object.assign({}, state, {showItems: action.showItems});
    }
    case TOGGLE_POLY_ROUND_COLLAPSE:
        return Object.assign({}, state, {collapsePoints: !state.collapsePoints});
    case TOGGLE_POLY_ROUND_AUTO_ORDER:
        // When turning auto-order ON, also immediately re-sort existing points
        return Object.assign({}, state, {
            autoOrder: !state.autoOrder,
            rawPoints: !state.autoOrder ? polarSort(state.rawPoints) : state.rawPoints
        });
    case SET_POLY_ROUND_POINTS: {
        const raw = Array.isArray(action.points) ? action.points.slice() : [];
        return Object.assign({}, state, {rawPoints: state.autoOrder ? polarSort(raw) : raw});
    }
    case EDIT_POLY_ROUND_POINT: {
        const pts = state.rawPoints.slice();
        if (action.index < 0 || action.index >= pts.length) return state;
        pts[action.index] = {x: action.x, y: action.y};
        return Object.assign({}, state, {rawPoints: state.autoOrder ? polarSort(pts) : pts});
    }
    case REMOVE_POLY_ROUND_POINT: {
        const pts = state.rawPoints.slice();
        if (action.index < 0 || action.index >= pts.length) return state;
        pts.splice(action.index, 1);
        return Object.assign({}, state, {rawPoints: state.autoOrder ? polarSort(pts) : pts});
    }
    case TRIGGER_POLY_ROUND_ACTION:
        actionCounter += 1;
        return Object.assign({}, state, {
            pendingAction: Object.assign({token: actionCounter, name: action.name}, action.payload || {})
        });
    case CONSUME_POLY_ROUND_ACTION:
        return Object.assign({}, state, {pendingAction: null});
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
const changePolyRoundShowItems = function (showItems) {
    return {type: CHANGE_POLY_ROUND_SHOW_ITEMS, showItems};
};
const togglePolyRoundCollapse = function () {
    return {type: TOGGLE_POLY_ROUND_COLLAPSE};
};
const togglePolyRoundAutoOrder = function () {
    return {type: TOGGLE_POLY_ROUND_AUTO_ORDER};
};
const setPolyRoundPoints = function (points) {
    return {type: SET_POLY_ROUND_POINTS, points};
};
const editPolyRoundPoint = function (index, x, y) {
    return {type: EDIT_POLY_ROUND_POINT, index, x, y};
};
const removePolyRoundPoint = function (index) {
    return {type: REMOVE_POLY_ROUND_POINT, index};
};
const triggerPolyRoundAction = function (name, payload) {
    return {type: TRIGGER_POLY_ROUND_ACTION, name, payload};
};
const consumePolyRoundAction = function () {
    return {type: CONSUME_POLY_ROUND_ACTION};
};

export {
    reducer as default,
    changePolyRoundRadius,
    changePolyRoundCornerStyle,
    changePolyRoundLimitRadius,
    changePolyRoundShowItems,
    togglePolyRoundCollapse,
    togglePolyRoundAutoOrder,
    setPolyRoundPoints,
    editPolyRoundPoint,
    removePolyRoundPoint,
    triggerPolyRoundAction,
    consumePolyRoundAction
};
