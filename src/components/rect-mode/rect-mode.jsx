import React from 'react';
import PropTypes from 'prop-types';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';
import messages from '../../lib/messages.js';

import {RectangleHorizontal} from 'lucide-react';

const RectModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={messages.rect}
        icon={RectangleHorizontal}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
        keybinding="R"
    />
);

RectModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default RectModeComponent;
