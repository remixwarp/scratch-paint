import React from 'react';
import PropTypes from 'prop-types';
import messages from '../../lib/messages.js';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';

import {SplinePointer} from 'lucide-react';

const ReshapeModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={messages.reshape}
        icon={SplinePointer}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
        keybinding="A"
    />
);

ReshapeModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default ReshapeModeComponent;
