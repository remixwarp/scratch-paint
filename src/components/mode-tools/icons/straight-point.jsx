import React from 'react';

const StraightPoint = props => (
    <svg
        {...props}
        width="20px"
        height="20px"
        viewBox="0 0 20 20"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
    >
        <title>straight-point</title>
        <desc>Created with Sketch.</desc>
        <defs />
        <g
            id="Page-1"
            stroke="none"
            strokeWidth="1"
            fill="none"
            fillRule="evenodd"
        >
            <g
                id="straight-point"
                fill="currentColor"
                style={{color: 'var(--paint-text-primary-default, #FFF)'}}
            >
                <polyline
                    id="Path-2"
                    stroke="currentColor"
                    strokeWidth="0.75"
                    fillOpacity="0.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points="2 15 10 7 18 15"
                />
                <circle
                    id="Oval-4"
                    fillOpacity="0.25"
                    cx="10"
                    cy="7"
                    r="3"
                />
                <circle
                    id="Oval-4"
                    cx="10"
                    cy="7"
                    r="2"
                />
            </g>
        </g>
    </svg>
);

export default StraightPoint;
