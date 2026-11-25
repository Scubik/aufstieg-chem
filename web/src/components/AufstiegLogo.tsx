import React from 'react';

interface AufstiegLogoProps {
  className?: string;
  strokeColor?: string;
  flagColor?: string;
}

export const AufstiegChairLogo: React.FC<AufstiegLogoProps> = ({
  className,
  strokeColor = 'currentColor',
  flagColor = 'currentColor',
}) => (
  <svg
    viewBox="0 0 148 136"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M14 124 L34 72 L74 72 L114 44 L94 96 L54 96 Z"
      stroke={strokeColor}
      strokeWidth="5.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line x1="25" y1="111" x2="38.5" y2="79" stroke={strokeColor} strokeWidth="3.9" strokeLinecap="round" />
    <line x1="78.5" y1="77.5" x2="103" y2="60.5" stroke={strokeColor} strokeWidth="3.9" strokeLinecap="round" />
    <line x1="57.5" y1="88.5" x2="87.5" y2="88.5" stroke={strokeColor} strokeWidth="3.9" strokeLinecap="round" />
    <line x1="114" y1="44" x2="114" y2="9" stroke={flagColor} strokeWidth="4.8" strokeLinecap="round" />
    <path
      d="M114 9 L136 18.5 L114 28 Z"
      fill={flagColor}
      fillOpacity="0.25"
      stroke={flagColor}
      strokeWidth="4.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
