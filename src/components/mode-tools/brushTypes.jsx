import React from 'react';

import PropTypes from 'prop-types';

import InputGroup from '../input-group/input-group.jsx';
import ButtonGroup from '../button-group/button-group.jsx';
import Button from '../button/button.jsx';
import classNames from 'classnames';

import styles from './mode-tools.css';

import {Circle, Square} from 'lucide-react';

import {defineMessages, injectIntl, intlShape} from 'react-intl';

const messages = defineMessages({
    brushCircle: {
        defaultMessage: 'Circle Brush',
        description: 'Label for the circle brush shape',
        id: 'paint.modeTools.brushCircle'
    },
    brushSquare: {
        defaultMessage: 'Square Brush',
        description: 'Label for the square brush shape',
        id: 'paint.modeTools.brushSquare'
    }
});

const BrushTypesComponent = props => (
    <InputGroup>
        <ButtonGroup>
            <Button
                className={
                    classNames(styles.buttonGroupButton)
                }
                onClick={() => props.onBrushChange('CIRCLE')}
            >
                <Circle
                    alt={props.intl.formatMessage(messages.brushCircle)}
                    className={styles.buttonGroupButtonIcon}
                    draggable={false}
                />
            </Button>
            <Button
                className={
                    classNames(styles.buttonGroupButton)
                }
                onClick={() => props.onBrushChange('SQUARE')}
            >
                <Square
                    alt={props.intl.formatMessage(messages.brushSquare)}
                    className={styles.buttonGroupButtonIcon}
                    draggable={false}
                />
            </Button>
        </ButtonGroup>
    </InputGroup>
);

BrushTypesComponent.propTypes = {
    intl: intlShape.isRequired,
    onBrushChange: PropTypes.func.isRequired
};

export default injectIntl(BrushTypesComponent);
