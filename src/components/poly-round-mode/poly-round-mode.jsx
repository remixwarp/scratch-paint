import React from 'react';
import PropTypes from 'prop-types';
import ToolSelectComponent from '../tool-select-base/tool-select-base.jsx';

import polyRoundIcon from './poly-round.svg';

// Use an inline descriptor instead of referencing messages.polyRound.
// See explanation: the crash "[React Intl] An id must be provided" was
// traced to ToolSelectComponent calling intl.formatMessage(imgDescriptor).
// Passing the descriptor inline guarantees the id/defaultMessage fields are
// intact regardless of how babel-plugin-react-intl rewrites the messages
// module at build time. The full messages.polyRoundMode.* keys live in
// src/lib/messages.js already; we just avoid importing them here.
const POLY_ROUND_DESCRIPTOR = {
    id: 'paint.polyRoundMode.polyRound',
    defaultMessage: 'Rounded Polygon'
};

const PolyRoundModeComponent = props => (
    <ToolSelectComponent
        imgDescriptor={POLY_ROUND_DESCRIPTOR}
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
