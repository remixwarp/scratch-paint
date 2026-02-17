/* eslint-disable no-case-declarations */
import classNames from 'classnames';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import React from 'react';

import Dropdown from '../dropdown/dropdown.jsx';
import MediaQuery from 'react-responsive';
import layout from '../../lib/layout-constants';

import {changeBrushSize, changeSimplifySize, setBrushType} from '../../reducers/brush-mode';
import {
    changeBrushSize as changeEraserSize,
    changeSimplifySize as changeEraserSimplifySize
} from '../../reducers/eraser-mode';
import {changeSimplifySize as changePenSimplifySize} from '../../reducers/pen-mode';
import {changeRoundedRectCornerSize} from '../../reducers/rounded-rect-mode';
import {changeRoundedCornerSize} from '../../reducers/rect-mode';
import {changeTrianglePolyCount, changeTrianglePointCount} from '../../reducers/triangle-mode';
import {changeCurrentlySelectedShape} from '../../reducers/sussy-mode';
import {changeBitBrushSize} from '../../reducers/bit-brush-size';
import {changeBitEraserSize} from '../../reducers/bit-eraser-size';
import {setShapesFilled} from '../../reducers/fill-bitmap-shapes';
import {setTextAlignment} from '../../reducers/text-alignment';

import FontDropdown from '../../containers/font-dropdown.jsx';
import LiveInputHOC from '../forms/live-input-hoc.jsx';
import Label from '../forms/label.jsx';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import Input from '../forms/input.jsx';
import InputGroup from '../input-group/input-group.jsx';
import BrushTypes from './brushTypes.jsx';
import LabeledIconButton from '../labeled-icon-button/labeled-icon-button.jsx';
import Modes from '../../lib/modes';
import Formats, {isBitmap, isVector} from '../../lib/format';
import {hideLabel} from '../../lib/hide-label';
import styles from './mode-tools.css';
import {MAX_STROKE_WIDTH} from '../../reducers/stroke-width';
import {
    selectableShapes as sussyToolShapes,
    categories as sussyToolCategories,
    generateShapeSVG as generateSussyShapeSVG,
    categorizeShapes as categorizeSussyShapes
} from '../../helper/selectable-shapes.js';

import {
    ClipboardCopy, Scissors, ClipboardPaste,
    Trash, FlipHorizontal2, FlipVertical2,
    Plus, TextAlignStart, TextAlignCenter,
    TextAlignEnd,
    SquaresIntersect, SquaresUnite, SquaresSubtract, SquaresExclude
} from 'lucide-react';

import RoundLine from './icons/round-line.jsx';
import SquareLine from './icons/square-line.jsx';
import MiterLineJoin from './icons/miter-line-join.jsx';
import RoundLineJoin from './icons/round-line-join.jsx';
import BevelLineJoin from './icons/bevel-line-join.jsx';
import bitBrushIcon from '../bit-brush-mode/brush.svg';
import bitEraserIcon from '../bit-eraser-mode/eraser.svg';
import bitLineIcon from '../bit-line-mode/line.svg';
import brushIcon from '../brush-mode/brush.svg';
import CurvedPointIcon from './icons/curved-point.jsx';
import eraserIcon from '../eraser-mode/eraser.svg';
import roundedRectIcon from '../rounded-rect-mode/rounded-rectangle.svg';
import triangleIcon from '../triangle-mode/triangle.svg';
import triangleSpikeRatioIcon from './icons/triangle-spike-ratio.svg';
import StraightPointIcon from './icons/straight-point.jsx';
import bitOvalIcon from '../bit-oval-mode/oval.svg';
import bitRectIcon from '../bit-rect-mode/rectangle.svg';
import bitOvalOutlinedIcon from '../bit-oval-mode/oval-outlined.svg';
import bitRectOutlinedIcon from '../bit-rect-mode/rectangle-outlined.svg';

const LiveInput = LiveInputHOC(Input);
const ModeToolsComponent = props => {
    const messages = defineMessages({
        brushSize: {
            defaultMessage: 'Size',
            description: 'Label for the brush size input',
            id: 'paint.modeTools.brushSize'
        },
        brushSimplify: {
            defaultMessage: 'Smoothing',
            description: 'Label for the brush smoothing input, higher numbers control how much the drawn line will be corrected',
            id: 'paint.modeTools.brushSimplify'
        },
        eraserSize: {
            defaultMessage: 'Eraser size',
            description: 'Label for the eraser size input',
            id: 'paint.modeTools.eraserSize'
        },
        eraserSimplify: {
            defaultMessage: 'Smoothing',
            description: 'Label for the eraser smoothing input, higher numbers control how much the drawn line will be corrected',
            id: 'paint.modeTools.eraserSimplify'
        },
        roundedCornerSize: {
            defaultMessage: 'Rounded corner size',
            description: 'Label for the Rounded corner size input',
            id: 'paint.modeTools.roundedCornerSize'
        },
        currentSideCount: {
            defaultMessage: 'Polygon side count',
            description: 'Label for the Polygon side count input',
            id: 'paint.modeTools.currentSideCount'
        },
        spokeRatio: {
            defaultMessage: 'Star spoke ratio',
            description: 'Label for the Star spoke ratio input, controls the size of the spokes on a star',
            id: 'paint.modeTools.spikeRatio'
        },
        penSimplify: {
            defaultMessage: 'Smoothing',
            description: 'Label for the pen smoothing input, higher numbers control how much the drawn line will be corrected',
            id: 'paint.modeTools.penSimplify'
        },
        copy: {
            defaultMessage: 'Copy',
            description: 'Label for the copy button',
            id: 'paint.modeTools.copy'
        },
        cut: {
            defaultMessage: 'Cut',
            description: 'Label for the cut button',
            id: 'paint.modeTools.cut'
        },
        paste: {
            defaultMessage: 'Paste',
            description: 'Label for the paste button',
            id: 'paint.modeTools.paste'
        },
        delete: {
            defaultMessage: 'Delete',
            description: 'Label for the delete button',
            id: 'paint.modeTools.delete'
        },
        curved: {
            defaultMessage: 'Curved',
            description: 'Label for the button that converts selected points to curves',
            id: 'paint.modeTools.curved'
        },
        pointed: {
            defaultMessage: 'Pointed',
            description: 'Label for the button that converts selected points to sharp points',
            id: 'paint.modeTools.pointed'
        },
        thickness: {
            defaultMessage: 'Thickness',
            description: 'Label for the number input to choose the line thickness',
            id: 'paint.modeTools.thickness'
        },
        flipHorizontal: {
            defaultMessage: 'Flip Horizontal',
            description: 'Label for the button to flip the image horizontally',
            id: 'paint.modeTools.flipHorizontal'
        },
        flipVertical: {
            defaultMessage: 'Flip Vertical',
            description: 'Label for the button to flip the image vertically',
            id: 'paint.modeTools.flipVertical'
        },
        filled: {
            defaultMessage: 'Filled',
            description: 'Label for the button that sets the bitmap rectangle/oval mode to draw outlines',
            id: 'paint.modeTools.filled'
        },
        outlined: {
            defaultMessage: 'Outlined',
            description: 'Label for the button that sets the bitmap rectangle/oval mode to draw filled-in shapes',
            id: 'paint.modeTools.outlined'
        },
        movementCenter: {
            defaultMessage: 'Center',
            description: 'Label for the button that moves the selected objects to the center of the canvas',
            id: 'paint.modeTools.movementCenter'
        },
        joinSpiked: {
            defaultMessage: 'Spiked',
            description: 'Label for the button that sets the line join to miter',
            id: 'pm.paint.modeTools.joinSpiked'
        },
        joinRounded: {
            defaultMessage: 'Rounded',
            description: 'Label for the button that sets the line join to round',
            id: 'pm.paint.modeTools.joinRounded'
        },
        joinBeveled: {
            defaultMessage: 'Beveled',
            description: 'Label for the button that sets the line join to bevel',
            id: 'pm.paint.modeTools.joinBeveled'
        },
        endRounded: {
            defaultMessage: 'Rounded',
            description: 'Label for the button that sets the line cap to round',
            id: 'pm.paint.modeTools.endRounded'
        },
        endSquared: {
            defaultMessage: 'Squared',
            description: 'Label for the button that sets the line cap to square',
            id: 'pm.paint.modeTools.endSquared'
        },
        merge: {
            defaultMessage: 'Merge',
            description: 'Label for the button that merges two selected objects together',
            id: 'pm.paint.modeTools.merge'
        },
        subtract: {
            defaultMessage: 'Subtract',
            description: 'Label for the button that subtracts selected objects from eachother',
            id: 'pm.paint.modeTools.subtract'
        },
        mask: {
            defaultMessage: 'Mask',
            description: 'Label for the button that ands two selected objects together',
            id: 'pm.paint.modeTools.mask'
        },
        filter: {
            defaultMessage: 'Exclude',
            description: 'Label for the button that xors two selected objects together',
            id: 'pm.paint.modeTools.filter'
        },
        leftAlign: {
            defaultMessage: 'Left Align',
            description: 'Label for the button that sets text alignment to the left',
            id: 'pm.paint.modeTools.leftAlign'
        },
        rightAlign: {
            defaultMessage: 'Right Align',
            description: 'Label for the button that sets text alignment to the right',
            id: 'pm.paint.modeTools.rightAlign'
        },
        centerAlign: {
            defaultMessage: 'Center Align',
            description: 'Label for the button that sets text alignment to the center',
            id: 'pm.paint.modeTools.centerAlign'
        },
        arrowTipResize: {
            defaultMessage: 'Hold Alt + Shift to resize arrow tip',
            description: 'Instruction for resizing arrow tip',
            id: 'paint.modeTools.arrowTipResize'
        },
        more: {
            defaultMessage: 'More',
            description: 'Label for dropdown to access more action buttons',
            id: 'paint.paintEditor.more'
        },
        // Categories for sussy tool
        categoryShapes: {
            defaultMessage: 'Shapes',
            description: 'Category for basic shapes',
            id: 'paint.sussyTool.category.shapes'
        },
        categorySymbols: {
            defaultMessage: 'Symbols',
            description: 'Category for symbols',
            id: 'paint.sussyTool.category.symbols'
        },
        categoryObjects: {
            defaultMessage: 'Objects',
            description: 'Category for objects',
            id: 'paint.sussyTool.category.objects'
        },
        categorySpeech: {
            defaultMessage: 'Speech',
            description: 'Category for speech bubbles',
            id: 'paint.sussyTool.category.speech'
        },
        categoryBlocks: {
            defaultMessage: 'Blocks',
            description: 'Category for blocks',
            id: 'paint.sussyTool.category.blocks'
        },
        categoryCustom: {
            defaultMessage: 'Custom',
            description: 'Category for custom shapes',
            id: 'paint.sussyTool.category.custom'
        },
        // Common shape names
        shapeTriangleRightAngle: {
            defaultMessage: 'Right Triangle',
            description: 'Name for right triangle shape',
            id: 'paint.sussyTool.shape.triangleRightAngle'
        },
        shapeChevronArrow: {
            defaultMessage: 'Chevron Arrow',
            description: 'Name for chevron arrow shape',
            id: 'paint.sussyTool.shape.chevronArrow'
        },
        shapeHeart: {
            defaultMessage: 'Heart',
            description: 'Name for heart shape',
            id: 'paint.sussyTool.shape.heart'
        },
        shapeSmile: {
            defaultMessage: 'Smile',
            description: 'Name for smile shape',
            id: 'paint.sussyTool.shape.smile'
        },
        shapeSun: {
            defaultMessage: 'Sun',
            description: 'Name for sun shape',
            id: 'paint.sussyTool.shape.sun'
        },
        shapeCloud: {
            defaultMessage: 'Cloud',
            description: 'Name for cloud shape',
            id: 'paint.sussyTool.shape.cloud'
        },
        shapeLightningBolt: {
            defaultMessage: 'Lightning Bolt',
            description: 'Name for lightning bolt shape',
            id: 'paint.sussyTool.shape.lightningBolt'
        },
        // Shapes category
        shapePentagonArrow: {
            defaultMessage: 'Pentagon Arrow',
            description: 'Name for pentagon arrow shape',
            id: 'paint.sussyTool.shape.pentagonArrow'
        },
        shapeTrapezoid: {
            defaultMessage: 'Trapezoid',
            description: 'Name for trapezoid shape',
            id: 'paint.sussyTool.shape.trapezoid'
        },
        shapeParallelogram: {
            defaultMessage: 'Parallelogram',
            description: 'Name for parallelogram shape',
            id: 'paint.sussyTool.shape.parallelogram'
        },
        shapeKite: {
            defaultMessage: 'Kite',
            description: 'Name for kite shape',
            id: 'paint.sussyTool.shape.kite'
        },
        // Symbols category
        shapeCheck: {
            defaultMessage: 'Checkmark',
            description: 'Name for checkmark shape',
            id: 'paint.sussyTool.shape.check'
        },
        shapeCross: {
            defaultMessage: 'Multiply',
            description: 'Name for multiply shape',
            id: 'paint.sussyTool.shape.cross'
        },
        shapePin: {
            defaultMessage: 'Pin',
            description: 'Name for pin shape',
            id: 'paint.sussyTool.shape.pin'
        },
        shapeFrown: {
            defaultMessage: 'Frown',
            description: 'Name for frown shape',
            id: 'paint.sussyTool.shape.frown'
        },
        shapePerson: {
            defaultMessage: 'Person',
            description: 'Name for person shape',
            id: 'paint.sussyTool.shape.person'
        },
        shapeStar: {
            defaultMessage: 'Star',
            description: 'Name for star shape',
            id: 'paint.sussyTool.shape.star'
        },
        shapeMoon: {
            defaultMessage: 'Moon',
            description: 'Name for moon shape',
            id: 'paint.sussyTool.shape.moon'
        },
        shapeCrescentMoon: {
            defaultMessage: 'Crescent Moon',
            description: 'Name for crescent moon shape',
            id: 'paint.sussyTool.shape.crescentMoon'
        },
        shapeMusicNote: {
            defaultMessage: 'Slanted Beamed Note',
            description: 'Name for slanted beamed note shape',
            id: 'paint.sussyTool.shape.musicNote'
        },
        shapeMusicNote2: {
            defaultMessage: 'Eighth Note',
            description: 'Name for eighth note shape',
            id: 'paint.sussyTool.shape.musicNote2'
        },
        shapeMusicNote3: {
            defaultMessage: 'Treble Clef',
            description: 'Name for treble clef shape',
            id: 'paint.sussyTool.shape.musicNote3'
        },
        shapeSussy: {
            defaultMessage: 'Sussy',
            description: 'Name for sussy shape',
            id: 'paint.sussyTool.shape.sussy'
        },
        shapeFineman: {
            defaultMessage: 'Fine Man',
            description: 'Name for fine man shape',
            id: 'paint.sussyTool.shape.fineman'
        },
        // Objects category
        shapeGear: {
            defaultMessage: 'Gear',
            description: 'Name for gear shape',
            id: 'paint.sussyTool.shape.gear'
        },
        shapeLightningBolt2: {
            defaultMessage: 'Bolt',
            description: 'Name for bolt shape',
            id: 'paint.sussyTool.shape.lightningBolt2'
        },
        shapeCloud: {
            defaultMessage: 'Cloud',
            description: 'Name for cloud shape',
            id: 'paint.sussyTool.shape.cloud'
        },
        shapeCloud2: {
            defaultMessage: 'Cloud 2',
            description: 'Name for cloud 2 shape',
            id: 'paint.sussyTool.shape.cloud2'
        },
        shapePinPush: {
            defaultMessage: 'Push Pin',
            description: 'Name for push pin shape',
            id: 'paint.sussyTool.shape.pinPush'
        },
        shapeBookmark: {
            defaultMessage: 'Bookmark',
            description: 'Name for bookmark shape',
            id: 'paint.sussyTool.shape.bookmark'
        },
        shapeNote: {
            defaultMessage: 'Note',
            description: 'Name for note shape',
            id: 'paint.sussyTool.shape.note'
        },
        shapePaper: {
            defaultMessage: 'Paper',
            description: 'Name for paper shape',
            id: 'paint.sussyTool.shape.paper'
        },
        shapeEye: {
            defaultMessage: 'Eye',
            description: 'Name for eye shape',
            id: 'paint.sussyTool.shape.eye'
        },
        shapeLock: {
            defaultMessage: 'Lock',
            description: 'Name for lock shape',
            id: 'paint.sussyTool.shape.lock'
        },
        shapeLockOpened: {
            defaultMessage: 'Open Lock',
            description: 'Name for open lock shape',
            id: 'paint.sussyTool.shape.lockOpened'
        },
        shapeInbox: {
            defaultMessage: 'Inbox',
            description: 'Name for inbox shape',
            id: 'paint.sussyTool.shape.inbox'
        },
        // Speech category
        shapeSpeechBubble: {
            defaultMessage: 'Speech Bubble',
            description: 'Name for speech bubble shape',
            id: 'paint.sussyTool.shape.speechBubble'
        },
        shapeThinkingBubble: {
            defaultMessage: 'Thinking Bubble',
            description: 'Name for thinking bubble shape',
            id: 'paint.sussyTool.shape.thinkingBubble'
        },
        shapeShoutBubble: {
            defaultMessage: 'Shout Bubble',
            description: 'Name for shout bubble shape',
            id: 'paint.sussyTool.shape.shoutBubble'
        },
        shapeSquareBubble: {
            defaultMessage: 'Square Bubble',
            description: 'Name for square bubble shape',
            id: 'paint.sussyTool.shape.squareBubble'
        },
        shapeCodeblock: {
            defaultMessage: 'Code Block',
            description: 'Name for code block shape',
            id: 'paint.sussyTool.shape.codeblock'
        },
        shapeCodeblockHat: {
            defaultMessage: 'Hat Block',
            description: 'Name for hat block shape',
            id: 'paint.sussyTool.shape.codeblockHat'
        },
        shapeCodeblockEndCap: {
            defaultMessage: 'End Cap Block',
            description: 'Name for end cap block shape',
            id: 'paint.sussyTool.shape.codeblockEndCap'
        },
        shapeCodeblockReporter: {
            defaultMessage: 'Reporter Block',
            description: 'Name for reporter block shape',
            id: 'paint.sussyTool.shape.codeblockReporter'
        },
        shapeCodeblockBoolean: {
            defaultMessage: 'Boolean Block',
            description: 'Name for boolean block shape',
            id: 'paint.sussyTool.shape.codeblockBoolean'
        }
    });

    // Helper function to get translated category name
    const getCategoryName = (categoryId) => {
        const categoryMessages = {
            'shapes': messages.categoryShapes,
            'symbols': messages.categorySymbols,
            'objects': messages.categoryObjects,
            'speech': messages.categorySpeech,
            'blocks': messages.categoryBlocks,
            'custom': messages.categoryCustom
        };
        if (categoryMessages[categoryId]) {
            return props.intl.formatMessage(categoryMessages[categoryId]);
        }
        return sussyToolCategories[categoryId];
    };

    // Helper function to get translated shape name
    const getShapeName = (shapeId) => {
        const shapeMessages = {
            'triangleRightAngle': messages.shapeTriangleRightAngle,
            'chevronArrow': messages.shapeChevronArrow,
            'heart': messages.shapeHeart,
            'smile': messages.shapeSmile,
            'sun': messages.shapeSun,
            'cloud': messages.shapeCloud,
            'lightningBolt': messages.shapeLightningBolt,
            'pentagonArrow': messages.shapePentagonArrow,
            'trapezoid': messages.shapeTrapezoid,
            'parallelogram': messages.shapeParallelogram,
            'kite': messages.shapeKite,
            'check': messages.shapeCheck,
            'cross': messages.shapeCross,
            'pin': messages.shapePin,
            'frown': messages.shapeFrown,
            'person': messages.shapePerson,
            'star': messages.shapeStar,
            'moon': messages.shapeMoon,
            'crescentMoon': messages.shapeCrescentMoon,
            'musicNote': messages.shapeMusicNote,
            'musicNote2': messages.shapeMusicNote2,
            'musicNote3': messages.shapeMusicNote3,
            'sussy': messages.shapeSussy,
            'fineman': messages.shapeFineman,
            'gear': messages.shapeGear,
            'lightningBolt2': messages.shapeLightningBolt2,
            'cloud2': messages.shapeCloud2,
            'pinPush': messages.shapePinPush,
            'bookmark': messages.shapeBookmark,
            'note': messages.shapeNote,
            'paper': messages.shapePaper,
            'eye': messages.shapeEye,
            'lock': messages.shapeLock,
            'lockOpened': messages.shapeLockOpened,
            'inbox': messages.shapeInbox,
            'speechBubble': messages.shapeSpeechBubble,
            'thinkingBubble': messages.shapeThinkingBubble,
            'shoutBubble': messages.shapeShoutBubble,
            'squareBubble': messages.shapeSquareBubble,
            'codeblock': messages.shapeCodeblock,
            'codeblockHat': messages.shapeCodeblockHat,
            'codeblockEndCap': messages.shapeCodeblockEndCap,
            'codeblockReporter': messages.shapeCodeblockReporter,
            'codeblockBoolean': messages.shapeCodeblockBoolean
        };
        if (shapeMessages[shapeId]) {
            return props.intl.formatMessage(shapeMessages[shapeId]);
        }
        return null;
    };

    switch (props.mode) {
    case Modes.BRUSH:
        /* falls through */
    case Modes.BIT_BRUSH:
        /* falls through */
    case Modes.BIT_LINE:
    {
        const currentIcon = isVector(props.format) ? brushIcon :
            props.mode === Modes.BIT_LINE ? bitLineIcon : bitBrushIcon;
        const currentBrushValue = isBitmap(props.format) ? props.bitBrushSize : props.brushValue;
        const currentSimplifyValue = props.simplifyValue;
        const changeFunction = isBitmap(props.format) ? props.onBitBrushSliderChange : props.onBrushSliderChange;
        const changeFunctionSimplify = props.onSimplifySliderChange;
        const currentMessage = props.mode === Modes.BIT_LINE ? messages.thickness : messages.brushSize;
        const hasSimplifyOption = props.mode === Modes.BRUSH;
        return (
            <div className={classNames(props.className, styles.modeTools)}>
                <div>
                    <img
                        alt={props.intl.formatMessage(currentMessage)}
                        title={props.intl.formatMessage(currentMessage)}
                        className={styles.modeToolsIcon}
                        draggable={false}
                        src={currentIcon}
                    />
                </div>
                <LiveInput
                    range
                    small
                    max={MAX_STROKE_WIDTH}
                    min="1"
                    type="number"
                    value={currentBrushValue}
                    onSubmit={changeFunction}
                />
                        
                {hasSimplifyOption && (
                    <Label
                        text={props.intl.formatMessage(messages.brushSimplify)}
                        style={{marginLeft: 'calc(2 * .25rem)'}}
                    >
                        <LiveInput
                            range
                            small
                            max={1000}
                            min="0"
                            type="number"
                            value={currentSimplifyValue}
                            onSubmit={changeFunctionSimplify}
                        />
                    </Label>
                )}

                {/* TODO replace this with a dropdown when we add more brush shapes */}
                {hasSimplifyOption && (
                    <BrushTypes
                        onBrushChange={props.onBrushChange}
                    />
                )}
            </div>
        );
    }
    case Modes.BIT_ERASER:
        /* falls through */
    case Modes.ERASER:
    {
        const currentIcon = isVector(props.format) ? eraserIcon : bitEraserIcon;
        const currentEraserValue = isBitmap(props.format) ? props.bitEraserSize : props.eraserValue;
        const currentEraserSimplifyValue = props.eraserSimplifyValue;
        const changeFunction = isBitmap(props.format) ? props.onBitEraserSliderChange : props.onEraserSliderChange;
        const changeFunctionSimplify = props.onEraserSimplifySliderChange;
        const hasSimplifyOption = props.mode === Modes.ERASER;
        return (
            <div className={classNames(props.className, styles.modeTools)}>
                <div>
                    <img
                        alt={props.intl.formatMessage(messages.eraserSize)}
                        title={props.intl.formatMessage(messages.eraserSize)}
                        className={styles.modeToolsIcon}
                        draggable={false}
                        src={currentIcon}
                    />
                </div>
                <LiveInput
                    range
                    small
                    max={MAX_STROKE_WIDTH}
                    min="1"
                    type="number"
                    value={currentEraserValue}
                    onSubmit={changeFunction}
                />

                {hasSimplifyOption && (
                    <Label
                        text={props.intl.formatMessage(messages.eraserSimplify)}
                        style={{marginLeft: 'calc(2 * .25rem)'}}
                    >
                        <LiveInput
                            range
                            small
                            max={1000}
                            min="0"
                            type="number"
                            value={currentEraserSimplifyValue}
                            onSubmit={changeFunctionSimplify}
                        />
                    </Label>
                )}

                {/* TODO replace this with a dropdown when we add more brush shapes */}
                {hasSimplifyOption && (
                    <BrushTypes
                        onBrushChange={props.onBrushChange}
                    />
                )}
            </div>
        );
    }
    case Modes.ROUNDED_RECT:
        /* falls through */
    case Modes.RECT:
    {
        // NOTE: BIT_RECT doesnt use Path, so this can't be added there the same way as RECT has it.
        const currentCornerValue = props.mode === Modes.ROUNDED_RECT ? props.roundedRectCornerValue : props.roundedCornerValue;
        const changeFunction = props.mode === Modes.ROUNDED_RECT ? props.onRoundedRectCornerSliderChange : props.onRoundedCornerSliderChange;
        return (
            <div className={classNames(props.className, styles.modeTools)}>
                <div>
                    <img
                        alt={props.intl.formatMessage(messages.roundedCornerSize)}
                        title={props.intl.formatMessage(messages.roundedCornerSize)}
                        className={styles.modeToolsIcon}
                        draggable={false}
                        src={roundedRectIcon}
                    />
                </div>
                <LiveInput
                    range
                    small
                    min={0}
                    max={1000}
                    type="number"
                    value={currentCornerValue}
                    onSubmit={changeFunction}
                />
            </div>
        );
    }
    case Modes.TRIANGLE:
    {
        const currentSideValue = props.trianglePolyValue;
        const currentPointValue = props.trianglePointValue;
        const changeFunction = props.onPolyCountSliderChange;
        const changeFunctionPoint = props.onPointCountSliderChange;
        return (
            <div className={classNames(props.className, styles.modeTools)}>
                <div>
                    <img
                        alt={props.intl.formatMessage(messages.currentSideCount)}
                        title={props.intl.formatMessage(messages.currentSideCount)}
                        className={styles.modeToolsIcon}
                        draggable={false}
                        src={triangleIcon}
                    />
                </div>
                <LiveInput
                    range
                    small
                    max={1000}
                    min="3"
                    type="number"
                    value={currentSideValue}
                    onSubmit={changeFunction}
                />
                <div>
                    <img
                        alt={props.intl.formatMessage(messages.spokeRatio)}
                        title={props.intl.formatMessage(messages.spokeRatio)}
                        className={styles.modeToolsIcon}
                        draggable={false}
                        src={triangleSpikeRatioIcon}
                    />
                </div>
                <LiveInput
                    range
                    small
                    max={1000}
                    min="0" // Spike ratio is limited to 0.01, but setting that here makes the number input arrows work really ugly
                    step="0.1"
                    type="number"
                    value={currentPointValue}
                    onSubmit={changeFunctionPoint}
                />
            </div>
        );
    }
    case Modes.SUSSY:
    {
        const currentlySelectedShape = props.currentlySelectedShape;
        const changeFunction = props.onCurrentlySelectedShapeChange;
        const selectedShapeObject = sussyToolShapes
            .filter(shape => shape.id === currentlySelectedShape)[0];
        const categorizedShapes = categorizeSussyShapes(sussyToolShapes);
        const selectableShapesList = (
            <InputGroup
                className={classNames(
                    styles.modDashedBorder,
                    styles.dropItemShapeToolMenu,
                    styles.dropdownMaxItemList
                )}
            >
                {Object.keys(categorizedShapes).map(categoryId => categorizedShapes[categoryId].length === 0 ?
                    (<React.Fragment key={categoryId} />) : (<React.Fragment key={categoryId}>
                        <p className={classNames(styles.dropItemShapeToolLabel)}>
                            {getCategoryName(categoryId)}
                        </p>
                        {categorizedShapes[categoryId].map(shape => (
                            <LabeledIconButton
                                key={shape.id}
                                className={classNames(styles.dropItemShapeTool)}
                                hideLabel={hideLabel(props.intl.locale)}
                                imgSrc={`data:image/svg+xml,${encodeURIComponent(generateSussyShapeSVG(shape))}`}
                                title={getShapeName(shape.id) || shape.name}
                                onClick={() => changeFunction(shape.id)}
                            />
                        ))}
                    </React.Fragment>))}
            </InputGroup>
        );
        return (
            <div className={classNames(props.className, styles.modeTools)}>
                <Dropdown
                    className={styles.modUnselect}
                    enterExitTransitionDurationMs={20}
                    popoverContent={
                        <InputGroup
                            className={styles.modContextMenu}
                            rtl={props.rtl}
                        >
                            {selectableShapesList}
                        </InputGroup>
                    }
                    tipSize={.01}
                >
                    <img
                        src={`data:image/svg+xml,${encodeURIComponent(generateSussyShapeSVG(selectedShapeObject))}`}
                        alt={selectedShapeObject.name}
                        title={selectedShapeObject.name}
                        height={16}
                    />
                </Dropdown>
            </div>
        );
    }
    case Modes.PEN:
    {
        const currentPenSimplifyValue = props.penSimplifyValue;
        const changeFunctionSimplify = props.onPenSimplifySliderChange;
        return (
            <div className={classNames(props.className, styles.modeTools)}>
                <Label
                    text={props.intl.formatMessage(messages.eraserSimplify)}
                    style={{marginLeft: 'calc(2 * .25rem)'}}
                >
                    <LiveInput
                        range
                        small
                        max={1000}
                        min="0"
                        type="number"
                        value={currentPenSimplifyValue}
                        onSubmit={changeFunctionSimplify}
                    />
                </Label>
            </div>
        );
    }
    case Modes.RESHAPE:
        const lineJoinReshape = (
            <InputGroup className={classNames(styles.modDashedBorder, styles.modLabeledIconHeight)}>
                <LabeledIconButton
                    disabled={props.hasSelectedMiterLineJoin}
                    hideLabel={hideLabel(props.intl.locale)}
                    icon={MiterLineJoin}
                    title={props.intl.formatMessage(messages.joinSpiked)}
                    onClick={props.onMiterLineJoin}
                />
                <LabeledIconButton
                    disabled={props.hasSelectedRoundLineJoin}
                    hideLabel={hideLabel(props.intl.locale)}
                    icon={RoundLineJoin}
                    title={props.intl.formatMessage(messages.joinRounded)}
                    onClick={props.onRoundLineJoin}
                />
                <LabeledIconButton
                    disabled={props.hasSelectedBevelLineJoin}
                    hideLabel={hideLabel(props.intl.locale)}
                    icon={BevelLineJoin}
                    title={props.intl.formatMessage(messages.joinBeveled)}
                    onClick={props.onBevelLineJoin}
                />
            </InputGroup>
        );
        const deleteSelectedNodes = (
            <InputGroup className={classNames(styles.modLabeledIconHeight)}>
                <LabeledIconButton
                    hideLabel={hideLabel(props.intl.locale)}
                    icon={Trash}
                    title={props.intl.formatMessage(messages.delete)}
                    onClick={props.onDelete}
                />
            </InputGroup>
        );
        return (
            <div className={classNames(props.className, styles.modeTools)}>
                <InputGroup className={classNames(styles.modDashedBorder, styles.modLabeledIconHeight)}>
                    <LabeledIconButton
                        disabled={!props.hasSelectedUncurvedPoints}
                        hideLabel={hideLabel(props.intl.locale)}
                        icon={CurvedPointIcon}
                        title={props.intl.formatMessage(messages.curved)}
                        onClick={props.onCurvePoints}
                    />
                    <LabeledIconButton
                        disabled={!props.hasSelectedUnpointedPoints}
                        hideLabel={hideLabel(props.intl.locale)}
                        icon={StraightPointIcon}
                        title={props.intl.formatMessage(messages.pointed)}
                        onClick={props.onPointPoints}
                    />
                </InputGroup>
                <InputGroup className={classNames(styles.modDashedBorder, styles.modLabeledIconHeight)}>
                    <LabeledIconButton
                        disabled={props.hasSelectedRoundEnds}
                        hideLabel={hideLabel(props.intl.locale)}
                        icon={RoundLine}
                        title={props.intl.formatMessage(messages.endRounded)}
                        onClick={props.onRoundEnds}
                    />
                    <LabeledIconButton
                        disabled={props.hasSelectedSquareEnds}
                        hideLabel={hideLabel(props.intl.locale)}
                        icon={SquareLine}
                        title={props.intl.formatMessage(messages.endSquared)}
                        onClick={props.onSquareEnds}
                    />
                </InputGroup>
                <MediaQuery minWidth={layout.fullSizeEditorMinWidthExtraToolsCollapsed}>
                    {lineJoinReshape}
                    {deleteSelectedNodes}
                </MediaQuery>
                <MediaQuery maxWidth={layout.fullSizeEditorMinWidthExtraToolsCollapsed - 1}>
                    <InputGroup className={classNames(styles.modDashedBorder, styles.modLabeledIconHeight)}>
                        <Dropdown
                            className={styles.modUnselect}
                            enterExitTransitionDurationMs={20}
                            popoverContent={
                                <InputGroup
                                    className={styles.modContextMenu}
                                    rtl={props.rtl}
                                >
                                    {lineJoinReshape}
                                    {deleteSelectedNodes}
                                </InputGroup>
                            }
                            tipSize={.01}
                        >
                            {props.intl.formatMessage(messages.more)}
                        </Dropdown>
                    </InputGroup>
                </MediaQuery>
            </div>
        );
    case Modes.BIT_SELECT:
        /* falls through */
    case Modes.SELECT:
        const reshapingMethods = props.format.startsWith('BITMAP') ? null : (
            <InputGroup className={classNames(styles.modDashedBorder, styles.modLabeledIconHeight)}>
                <LabeledIconButton
                    hideLabel={hideLabel(props.intl.locale)}
                    icon={SquaresUnite}
                    title={props.intl.formatMessage(messages.merge)}
                    onClick={props.onMergeShape}
                />
                <LabeledIconButton
                    hideLabel={hideLabel(props.intl.locale)}
                    icon={SquaresIntersect}
                    title={props.intl.formatMessage(messages.mask)}
                    onClick={props.onMaskShape}
                />
                <LabeledIconButton
                    hideLabel={hideLabel(props.intl.locale)}
                    icon={SquaresSubtract}
                    title={props.intl.formatMessage(messages.subtract)}
                    onClick={props.onSubtractShape}
                />
                <LabeledIconButton
                    hideLabel={hideLabel(props.intl.locale)}
                    icon={SquaresExclude}
                    title={props.intl.formatMessage(messages.filter)}
                    onClick={props.onExcludeShape}
                />
            </InputGroup>
        );
        const flipOptions = (
            <InputGroup className={classNames(styles.modDashedBorder, styles.modLabeledIconHeight)}>
                <LabeledIconButton
                    hideLabel={hideLabel(props.intl.locale)}
                    icon={FlipHorizontal2}
                    title={props.intl.formatMessage(messages.flipHorizontal)}
                    onClick={props.onFlipHorizontal}
                />
                <LabeledIconButton
                    hideLabel={hideLabel(props.intl.locale)}
                    icon={FlipVertical2}
                    title={props.intl.formatMessage(messages.flipVertical)}
                    onClick={props.onFlipVertical}
                />
            </InputGroup>
        );
        const movementOptions = (
            <InputGroup className={classNames(styles.modDashedBorder, styles.modLabeledIconHeight)}>
                <LabeledIconButton
                    hideLabel={hideLabel(props.intl.locale)}
                    icon={Plus}
                    title={props.intl.formatMessage(messages.movementCenter)}
                    onClick={props.onCenterSelection}
                />
            </InputGroup>
        );
        return (
            <div className={classNames(props.className, styles.modeTools)}>
                <InputGroup className={classNames(styles.modDashedBorder, styles.modLabeledIconHeight)}>
                    <LabeledIconButton
                        hideLabel={hideLabel(props.intl.locale)}
                        icon={ClipboardCopy}
                        title={props.intl.formatMessage(messages.copy)}
                        onClick={props.onCopyToClipboard}
                    />
                    <LabeledIconButton
                        disabled={!(props.clipboardItems.length > 0)}
                        hideLabel={hideLabel(props.intl.locale)}
                        icon={ClipboardPaste}
                        title={props.intl.formatMessage(messages.paste)}
                        onClick={props.onPasteFromClipboard}
                    />
                    <LabeledIconButton
                        hideLabel={hideLabel(props.intl.locale)}
                        icon={Scissors}
                        title={props.intl.formatMessage(messages.cut)}
                        onClick={props.onCutToClipboard}
                    />
                </InputGroup>
                <InputGroup className={classNames(styles.modDashedBorder, styles.modLabeledIconHeight)}>
                    <LabeledIconButton
                        hideLabel={hideLabel(props.intl.locale)}
                        icon={Trash}
                        title={props.intl.formatMessage(messages.delete)}
                        onClick={props.onDelete}
                    />
                </InputGroup>
                <MediaQuery minWidth={layout.fullSizeEditorMinWidthExtraToolsCollapsed}>
                    {/* Flip Options */}
                    {flipOptions}
                    {/* Movement Options */}
                    {movementOptions}
                    {/* Reshaping Methods */}
                    {(props.mode === Modes.SELECT) ? (
                        <MediaQuery minWidth={layout.fullSizeEditorMinWidthExtraTools}>
                            {reshapingMethods}
                        </MediaQuery>
                    ) : null}
                    {(props.mode === Modes.SELECT) ? (
                        <MediaQuery maxWidth={layout.fullSizeEditorMinWidthExtraTools - 1}>
                            <InputGroup className={classNames(styles.modDashedBorder, styles.modLabeledIconHeight)}>
                                <Dropdown
                                    className={styles.modUnselect}
                                    enterExitTransitionDurationMs={20}
                                    popoverContent={
                                        <InputGroup
                                            className={styles.modContextMenu}
                                            rtl={props.rtl}
                                        >
                                            {reshapingMethods}
                                        </InputGroup>
                                    }
                                    tipSize={.01}
                                >
                                    {props.intl.formatMessage(messages.more)}
                                </Dropdown>
                            </InputGroup>
                        </MediaQuery>
                    ) : null}
                </MediaQuery>
                <MediaQuery maxWidth={layout.fullSizeEditorMinWidthExtraToolsCollapsed - 1}>
                    <InputGroup className={classNames(styles.modDashedBorder, styles.modLabeledIconHeight)}>
                        <Dropdown
                            className={styles.modUnselect}
                            enterExitTransitionDurationMs={20}
                            popoverContent={
                                <InputGroup
                                    className={styles.modContextMenu}
                                    rtl={props.rtl}
                                >
                                    {flipOptions}
                                    {movementOptions}
                                    {reshapingMethods}
                                </InputGroup>
                            }
                            tipSize={.01}
                        >
                            {props.intl.formatMessage(messages.more)}
                        </Dropdown>
                    </InputGroup>
                </MediaQuery>
            </div>
        );
    case Modes.BIT_TEXT:
        /* falls through */
    case Modes.TEXT:
        return (
            <div className={classNames(props.className, styles.modeTools)}>
                <InputGroup className={classNames(styles.modDashedBorder)}>
                    <FontDropdown
                        onUpdateImage={props.onUpdateImage}
                        onManageFonts={props.onManageFonts}
                    />
                </InputGroup>
                <InputGroup className={classNames(styles.modDashedBorder, styles.modLabeledIconHeight)}>
                    <LabeledIconButton
                        hideLabel
                        icon={TextAlignStart}
                        title={props.intl.formatMessage(messages.leftAlign)}
                        onClick={props.onTextAlignLeft}
                    />
                    <LabeledIconButton
                        hideLabel
                        icon={TextAlignCenter}
                        title={props.intl.formatMessage(messages.centerAlign)}
                        onClick={props.onTextAlignCenter}
                    />
                    <LabeledIconButton
                        hideLabel
                        icon={TextAlignEnd}
                        title={props.intl.formatMessage(messages.rightAlign)}
                        onClick={props.onTextAlignRight}
                    />
                </InputGroup>
            </div>
        );
    case Modes.BIT_RECT:
        /* falls through */
    case Modes.BIT_OVAL:
    {
        const fillIcon = props.mode === Modes.BIT_RECT ? bitRectIcon : bitOvalIcon;
        const outlineIcon = props.mode === Modes.BIT_RECT ? bitRectOutlinedIcon : bitOvalOutlinedIcon;
        return (
            <div className={classNames(props.className, styles.modeTools)}>
                <InputGroup>
                    <LabeledIconButton
                        highlighted={props.fillBitmapShapes}
                        imgSrc={fillIcon}
                        title={props.intl.formatMessage(messages.filled)}
                        onClick={props.onFillShapes}
                    />
                </InputGroup>
                <InputGroup>
                    <LabeledIconButton
                        highlighted={!props.fillBitmapShapes}
                        imgSrc={outlineIcon}
                        title={props.intl.formatMessage(messages.outlined)}
                        onClick={props.onOutlineShapes}
                    />
                </InputGroup>
                {props.fillBitmapShapes ? null : (
                    <InputGroup>
                        <Label text={props.intl.formatMessage(messages.thickness)}>
                            <LiveInput
                                range
                                small
                                max={MAX_STROKE_WIDTH}
                                min="1"
                                type="number"
                                value={props.bitBrushSize}
                                onSubmit={props.onBitBrushSliderChange}
                            />
                        </Label>
                    </InputGroup>)
                }
            </div>
        );
    }
    case Modes.ARROW:
    {
        return (
            <div className={classNames(props.className, styles.modeTools)}>
                <span>{props.intl.formatMessage(messages.arrowTipResize)}</span>
            </div>
        );
    }
    default:
        // Leave empty for now, if mode not supported
        return (
            <div className={classNames(props.className, styles.modeTools)} />
        );
    }
};

ModeToolsComponent.propTypes = {
    bitBrushSize: PropTypes.number,
    bitEraserSize: PropTypes.number,
    brushValue: PropTypes.number,
    simplifyValue: PropTypes.number,
    className: PropTypes.string,
    clipboardItems: PropTypes.arrayOf(PropTypes.array),
    eraserValue: PropTypes.number,
    eraserSimplifyValue: PropTypes.number,
    brushType: PropTypes.string,
    penSimplifyValue: PropTypes.number,
    roundedCornerValue: PropTypes.number,
    roundedRectCornerValue: PropTypes.number,
    trianglePolyValue: PropTypes.number,
    trianglePointValue: PropTypes.number,
    currentlySelectedShape: PropTypes.string,
    fillBitmapShapes: PropTypes.bool,
    format: PropTypes.oneOf(Object.keys(Formats)),
    hasSelectedUncurvedPoints: PropTypes.bool,
    hasSelectedUnpointedPoints: PropTypes.bool,
    intl: intlShape.isRequired,
    mode: PropTypes.string.isRequired,
    onBitBrushSliderChange: PropTypes.func.isRequired,
    onBitEraserSliderChange: PropTypes.func.isRequired,
    onBrushSliderChange: PropTypes.func.isRequired,
    onSimplifySliderChange: PropTypes.func.isRequired,
    onCopyToClipboard: PropTypes.func.isRequired,
    onCutToClipboard: PropTypes.func.isRequired,
    onCurvePoints: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onEraserSliderChange: PropTypes.func,
    onBrushChange: PropTypes.func,
    onEraserSimplifySliderChange: PropTypes.func,
    onPenSimplifySliderChange: PropTypes.func,
    onFillShapes: PropTypes.func.isRequired,
    onFlipHorizontal: PropTypes.func.isRequired,
    onFlipVertical: PropTypes.func.isRequired,
    onCenterSelection: PropTypes.func.isRequired,
    onManageFonts: PropTypes.func,
    onOutlineShapes: PropTypes.func.isRequired,
    onPasteFromClipboard: PropTypes.func.isRequired,
    onPointPoints: PropTypes.func.isRequired,
    onUpdateImage: PropTypes.func.isRequired,

    onMergeShape: PropTypes.func.isRequired,
    onMaskShape: PropTypes.func.isRequired,
    onSubtractShape: PropTypes.func.isRequired,
    onExcludeShape: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    mode: state.scratchPaint.mode,
    format: state.scratchPaint.format,
    fillBitmapShapes: state.scratchPaint.fillBitmapShapes,
    bitBrushSize: state.scratchPaint.bitBrushSize,
    bitEraserSize: state.scratchPaint.bitEraserSize,
    brushValue: state.scratchPaint.brushMode.brushSize,
    simplifyValue: state.scratchPaint.brushMode.simplifySize,
    clipboardItems: state.scratchPaint.clipboard.items,
    eraserValue: state.scratchPaint.eraserMode.brushSize,
    eraserSimplifyValue: state.scratchPaint.eraserMode.simplifySize,
    brushType: state.scratchPaint.brushType,
    penSimplifyValue: state.scratchPaint.penMode.simplifySize,
    roundedRectCornerValue: state.scratchPaint.roundedRectMode.roundedCornerSize,
    roundedCornerValue: state.scratchPaint.rectMode.roundedCornerSize,
    trianglePolyValue: state.scratchPaint.triangleMode.trianglePolyCount,
    trianglePointValue: state.scratchPaint.triangleMode.trianglePointCount,
    currentlySelectedShape: state.scratchPaint.sussyMode.shape
});
const mapDispatchToProps = dispatch => ({
    onBrushSliderChange: brushSize => {
        dispatch(changeBrushSize(brushSize));
    },
    onSimplifySliderChange: brushSize => {
        dispatch(changeSimplifySize(brushSize));
    },
    onRoundedRectCornerSliderChange: roundedCornerSize => {
        dispatch(changeRoundedRectCornerSize(roundedCornerSize));
    },
    onRoundedCornerSliderChange: roundedCornerSize => {
        dispatch(changeRoundedCornerSize(roundedCornerSize));
    },
    onPolyCountSliderChange: polyCount => {
        dispatch(changeTrianglePolyCount(polyCount));
    },
    onPointCountSliderChange: polyCount => {
        dispatch(changeTrianglePointCount(polyCount));
    },
    onCurrentlySelectedShapeChange: shape => {
        dispatch(changeCurrentlySelectedShape(shape));
    },
    onBitBrushSliderChange: bitBrushSize => {
        dispatch(changeBitBrushSize(bitBrushSize));
    },
    onBitEraserSliderChange: eraserSize => {
        dispatch(changeBitEraserSize(eraserSize));
    },
    onEraserSliderChange: eraserSize => {
        dispatch(changeEraserSize(eraserSize));
    },
    onEraserSimplifySliderChange: eraserSize => {
        dispatch(changeEraserSimplifySize(eraserSize));
    },
    onBrushChange: type => {
        dispatch(setBrushType(type));
    },
    onPenSimplifySliderChange: eraserSize => {
        dispatch(changePenSimplifySize(eraserSize));
    },
    onFillShapes: () => {
        dispatch(setShapesFilled(true));
    },
    onOutlineShapes: () => {
        dispatch(setShapesFilled(false));
    },
    onTextAlignLeft: () => {
        dispatch(setTextAlignment('left'));
    },
    onTextAlignRight: () => {
        dispatch(setTextAlignment('right'));
    },
    onTextAlignCenter: () => {
        dispatch(setTextAlignment('center'));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(injectIntl(ModeToolsComponent));
