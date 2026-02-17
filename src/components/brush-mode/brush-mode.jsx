import React from 'react';
import PropTypes from 'prop-types';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';
import messages from '../../lib/messages.js';

import {Paintbrush} from 'lucide-react';

const BrushModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={messages.brush}
        icon={Paintbrush}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
        keybinding="B"
    />
);

BrushModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default BrushModeComponent;
