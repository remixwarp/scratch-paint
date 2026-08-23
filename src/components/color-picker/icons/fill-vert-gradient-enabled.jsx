import React from 'react';

const FillVertGradientEnabled = props => (
    <svg
        {...props}
        width="20px"
        height="20px"
        viewBox="0 0 20 20"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
    >
        <title>fill-vert-gradient-enabled</title>
        <desc>Created with Sketch.</desc>
        <defs>
            <linearGradient
                x1="50%"
                y1="0%"
                x2="50%"
                y2="100%"
                id="linearGradient-vert"
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
            </linearGradient>
        </defs>
        <g
            id="fill-vert-gradient-enabled"
            stroke="none"
            strokeWidth="1"
            fill="none"
            fillRule="evenodd"
            strokeOpacity="0.15"
        >
            <rect
                id="Vertical"
                stroke="#000000"
                fill="url(#linearGradient-vert)"
                x="0.5"
                y="0.5"
                width="19"
                height="19"
                rx="4"
            />
        </g>
    </svg>
);

export default FillVertGradientEnabled;
