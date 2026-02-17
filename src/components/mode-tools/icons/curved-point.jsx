import React from 'react';

const CurvedPoint = props => (
    <svg
        {...props}
        width="20px"
        height="20px"
        viewBox="0 0 20 20"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
    >
        <title>curved-point</title>
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
                id="curved-point"
                style={{color: 'var(--paint-text-primary-default, #FFF)'}}
            >
                <path
                    d="M2,15 C2,10.5818452 5.58151214,7 10.000744,7 C14.4184879,7 18,10.5818452 18,15"
                    id="Stroke-3"
                    stroke="currentColor"
                    strokeWidth="0.75"
                    fillOpacity="0.25"
                    fill="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M3,7 L17,7"
                    id="Stroke-7"
                    stroke="currentColor"
                    strokeWidth="0.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <circle
                    id="Oval-4"
                    fillOpacity="0.25"
                    fill="currentColor"
                    cx="10"
                    cy="7"
                    r="3"
                />
                <circle
                    id="Oval-4"
                    fill="currentColor"
                    cx="10"
                    cy="7"
                    r="2"
                />
                <circle
                    id="Oval-5"
                    fill="currentColor"
                    cx="3"
                    cy="7"
                    r="1"
                />
                <circle
                    id="Oval-5-Copy"
                    fill="currentColor"
                    cx="17"
                    cy="7"
                    r="1"
                />
            </g>
        </g>
    </svg>
);

export default CurvedPoint;
