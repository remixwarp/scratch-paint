import React from 'react';
import PropTypes from 'prop-types';
import messages from '../../lib/messages.js';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';

import polyRoundIcon from './poly-round.svg';

const PolyRoundModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={messages.polyRound}
        imgSrc={polyRoundIcon}
        isSelected={props.isSelected}
        onMouseDown={props.onMouseDown}
    />
);

PolyRoundModeComponent.propTypes = {
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default PolyRoundModeComponent;
