import React from 'react';
import PropTypes from 'prop-types';
import messages from '../../lib/messages.js';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';

import {SquareDashedMousePointer} from 'lucide-react';

const SelectModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={messages.select}
        icon={SquareDashedMousePointer}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
        keybinding="S"
    />
);

SelectModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default SelectModeComponent;
