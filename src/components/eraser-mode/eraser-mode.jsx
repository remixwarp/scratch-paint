import React from 'react';
import PropTypes from 'prop-types';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';
import messages from '../../lib/messages.js';

import {Eraser} from 'lucide-react';

const EraserModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={messages.eraser}
        icon={Eraser}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
        keybinding="E"
    />
);

EraserModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default EraserModeComponent;
