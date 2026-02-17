import React from 'react';

const MiterLineJoin = props => (
    <svg
        {...props}
        width="20px"
        height="20px"
        viewBox="0,0,20,20"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
    >
        <g
            strokeLinecap="round"
            stroke="currentColor"
            fill="currentColor"
            fillOpacity="0.25"
            strokeWidth="4"
            strokeLinejoin="miter"
            style={{color: 'var(--paint-text-primary-default, #FFF)'}}
        ><path d="M3,17 L10,3 L17,17" /></g>
    </svg>
);

export default MiterLineJoin;
