import {defineMessages} from 'react-intl';

const messages = defineMessages({
    brush: {
        defaultMessage: 'Brush',
        description: 'Label for the brush tool',
        id: 'paint.brushMode.brush'
    },
    eraser: {
        defaultMessage: 'Eraser',
        description: 'Label for the eraser tool',
        id: 'paint.eraserMode.eraser'
    },
    fill: {
        defaultMessage: 'Fill',
        description: 'Label for the fill tool',
        id: 'paint.fillMode.fill'
    },
    line: {
        defaultMessage: 'Line',
        description: 'Label for the line tool',
        id: 'paint.lineMode.line'
    },
    oval: {
        defaultMessage: 'Circle',
        description: 'Label for the oval-drawing tool',
        id: 'paint.ovalMode.oval'
    },
    rect: {
        defaultMessage: 'Rectangle',
        description: 'Label for the rectangle tool',
        id: 'paint.rectMode.rect'
    },
    reshape: {
        defaultMessage: 'Reshape',
        description: 'Label for the reshape tool, which allows changing the points in the lines of the vectors',
        id: 'paint.reshapeMode.reshape'
    },
    roundedRect: {
        defaultMessage: 'Rounded Rectangle',
        description: 'Label for the rounded rectangle tool',
        id: 'paint.roundedRectMode.roundedRect'
    },
    select: {
        defaultMessage: 'Select',
        description: 'Label for the select tool, which allows selecting, moving, and resizing shapes',
        id: 'paint.selectMode.select'
    },
    text: {
        defaultMessage: 'Text',
        description: 'Label for the text tool',
        id: 'paint.textMode.text'
    },
    sussy: {
        defaultMessage: 'Shapes',
        description: 'Label for the shape tool',
        id: 'paint.shapeMode.shape'
    },
    dragon: {
        defaultMessage: 'Dragon',
        description: 'Label for the totally a normal dragon head drawer dragon drawing tool',
        id: 'paint.dragonMode.dragon'
    },
    triangle: {
        defaultMessage: 'Triangle',
        description: 'Label for the triangle tool',
        id: 'paint.triangleMode.triangle'
    },
    arrow: {
        defaultMessage: 'Arrow',
        description: 'Label for the arrow tool',
        id: 'paint.arrowMode.arrow'
    },
    polyRound: {
        defaultMessage: 'Rounded Polygon',
        description: 'Label for the rounded polygon tool',
        id: 'paint.polyRoundMode.polyRound'
    },
    polyRoundRadius: {
        defaultMessage: 'Corner Radius',
        description: 'Label for the corner radius slider',
        id: 'paint.polyRoundMode.radius'
    },
    polyRoundCornerStyle: {
        defaultMessage: 'Corner Style',
        description: 'Label for the corner style dropdown',
        id: 'paint.polyRoundMode.cornerStyle'
    },
    polyRoundStyleArc: {
        defaultMessage: 'Arc',
        description: 'Label for the arc corner style option',
        id: 'paint.polyRoundMode.styleArc'
    },
    polyRoundStyleBezier: {
        defaultMessage: 'Bezier',
        description: 'Label for the bezier corner style option',
        id: 'paint.polyRoundMode.styleBezier'
    },
    polyRoundLimitRadius: {
        defaultMessage: 'Consistent Radius',
        description: 'Label for the consistent radius checkbox',
        id: 'paint.polyRoundMode.limitRadius'
    },
    polyRoundPoints: {
        defaultMessage: 'Points',
        description: 'Label for the coordinates section',
        id: 'paint.polyRoundMode.points'
    },
    polyRoundAddPoint: {
        defaultMessage: 'Add Point',
        description: 'Label for the add-point button',
        id: 'paint.polyRoundMode.addPoint'
    },
    polyRoundClear: {
        defaultMessage: 'Clear',
        description: 'Label for the clear button',
        id: 'paint.polyRoundMode.clear'
    },
    polyRoundDone: {
        defaultMessage: 'Finish',
        description: 'Label for the finish button that commits the shape to the canvas',
        id: 'paint.polyRoundMode.done'
    },
    polyRoundCollapse: {
        defaultMessage: 'Collapse / Expand',
        description: 'Label for the collapse/expand toggle on the point list',
        id: 'paint.polyRoundMode.collapse'
    },
    polyRoundHint: {
        defaultMessage: 'Click on the canvas to add vertices. Drag any vertex marker to reshape. Finish with double-click, Enter, or the Finish button.',
        description: 'Hint shown to the user explaining how to use the rounded polygon tool — add, drag, finish',
        id: 'paint.polyRoundMode.hint',
    }
});

export default messages;
