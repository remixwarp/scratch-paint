import React from 'react';

const FillHorzGradientEnabled = props => (
    <svg
        {...props}
        width="20px"
        height="20px"
        viewBox="0 0 20 20"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
    >
        <title>fill-horz-gradient-enabled</title>
        <desc>Created with Sketch.</desc>
        <defs>
            <linearGradient
                x1="100%"
                y1="50%"
                x2="0%"
                y2="50%"
                id="linearGradient-1"
            >
                <stop
                    stopColor="#FFFFFF"
                    offset="0%"
                />
                <stop
                    stopColor="currentColor"
                    style={{color: 'var(--paint-looks-secondary-default, #FF8C1A)'}}
                    offset="100%"
                />
            </linearGradient>
        </defs>
        <g
            id="fill-horz-gradient-enabled"
            stroke="none"
            strokeWidth="1"
            fill="none"
            fillRule="evenodd"
            strokeOpacity="0.15"
        >
            <rect
                id="Horizontal"
                stroke="#000000"
                fill="url(#linearGradient-1)"
                x="0.5"
                y="0.5"
                width="19"
                height="19"
                rx="4"
            />
        </g>
    </svg>
);

export default FillHorzGradientEnabled;
