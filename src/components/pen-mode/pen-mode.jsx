import React from 'react';
import PropTypes from 'prop-types';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';

import {PenTool} from 'lucide-react';

const PenModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={{
            defaultMessage: 'Pen',
            description: 'Label for the pen tool, which draws outlines',
            id: 'paint.penMode.pen'
        }}
        icon={PenTool}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
    />
);

PenModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default PenModeComponent;
