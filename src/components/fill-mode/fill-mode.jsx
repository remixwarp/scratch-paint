import React from 'react';
import PropTypes from 'prop-types';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';
import messages from '../../lib/messages.js';

import {PaintBucket} from 'lucide-react';

const FillModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={messages.fill}
        icon={PaintBucket}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
        keybinding="F"
    />
);

FillModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default FillModeComponent;
