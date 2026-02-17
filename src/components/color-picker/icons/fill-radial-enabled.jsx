import React from 'react';

const FillRadialEnabled = props => (
    <svg
        {...props}
        width="20px"
        height="20px"
        viewBox="0 0 20 20"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
    >
        <title>fill-radial-enabled</title>
        <desc>Created with Sketch.</desc>
        <defs>
            <radialGradient
                cx="50%"
                cy="50%"
                fx="50%"
                fy="50%"
                r="39.3896484%"
                id="radialGradient-1"
            >
                <stop
                    stopColor="currentColor"
                    style={{color: 'var(--paint-looks-secondary-default, #FF8C1A)'}}
                    offset="0%"
                />
                <stop
                    stopColor="#FFFFFF"
                    offset="100%"
                />
            </radialGradient>
        </defs>
        <g
            id="fill-radial-enabled"
            stroke="none"
            strokeWidth="1"
            fill="none"
            fillRule="evenodd"
            strokeOpacity="0.15"
        >
            <rect
                id="Radial"
                stroke="#000000"
                fill="url(#radialGradient-1)"
                x="0.5"
                y="0.5"
                width="19"
                height="19"
                rx="4"
            />
        </g>
    </svg>
);

export default FillRadialEnabled;
