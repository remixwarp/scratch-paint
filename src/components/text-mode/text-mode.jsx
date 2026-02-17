import React from 'react';
import PropTypes from 'prop-types';
import messages from '../../lib/messages.js';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';

import {CaseSensitive} from 'lucide-react';

const TextModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={messages.text}
        icon={CaseSensitive}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
        keybinding="T"
    />
);

TextModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default TextModeComponent;
