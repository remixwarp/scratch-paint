import React from 'react';
import PropTypes from 'prop-types';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';
import messages from '../../lib/messages.js';
import {ArrowBigRight} from 'lucide-react';

const ArrowModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={messages.arrow}
        icon={ArrowBigRight}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
    />
);

ArrowModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default ArrowModeComponent;
