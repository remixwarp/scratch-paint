import React from 'react';
import PropTypes from 'prop-types';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';
import messages from '../../lib/messages.js';

import {Circle} from 'lucide-react';

const OvalModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={messages.oval}
        icon={Circle}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
        keybinding="C"
    />
);

OvalModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default OvalModeComponent;
