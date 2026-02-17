import React from 'react';

const SquareLine = props => (
    <svg
        {...props}
        width="20px"
        height="20px"
        viewBox="0,0,20,20"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
    >
        <g
            strokeLinecap="butt"
            stroke="currentColor"
            strokeWidth="6"
            style={{color: 'var(--paint-text-primary-default, #FFF)'}}
        ><path d="M3,17 L17,3" /></g>
    </svg>
);

export default SquareLine;
