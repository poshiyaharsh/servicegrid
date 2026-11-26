import React from 'react';

export interface BrandLogoProps {
  variant?: 'primary' | 'dark' | 'light' | 'icon' | 'monochrome';
  className?: string;
}

export function BrandLogo({ variant = 'primary', className = '' }: BrandLogoProps) {
  const isDarkSurface = variant === 'dark';
  const isMonochrome = variant === 'monochrome';

  const nodeColor = isMonochrome ? '#0F172A' : isDarkSurface ? '#F8FAFC' : '#0F172A';
  const accentColor = isMonochrome ? '#0F172A' : isDarkSurface ? '#14B8A6' : '#0D9488';
  const mutedNodeColor = isMonochrome ? '#0F172A' : isDarkSurface ? '#94A3B8' : '#334155';
  const wordmarkColor = isDarkSurface ? '#F8FAFC' : '#0F172A';

  if (variant === 'icon') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        width={32}
        height={32}
        role="img"
        aria-label="FieldSutra"
        className={className}
      >
        <g transform="translate(4, 4)">
          <rect x="0" y="0" width="18" height="18" rx="4.5" fill={nodeColor} />
          <rect x="22" y="0" width="18" height="18" rx="9" fill={accentColor} />
          <rect x="0" y="22" width="18" height="18" rx="4.5" fill={nodeColor} />
          <rect x="22" y="22" width="18" height="18" rx="4.5" fill={mutedNodeColor} />
          <path
            d="M18 9h4M9 18v4M31 18v4M18 31h4"
            stroke={accentColor}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 48"
      width={165}
      height={36}
      role="img"
      aria-label="FieldSutra"
      className={className}
    >
      <g transform="translate(4, 4)">
        <rect x="0" y="0" width="18" height="18" rx="4.5" fill={nodeColor} />
        <rect x="22" y="0" width="18" height="18" rx="9" fill={accentColor} />
        <rect x="0" y="22" width="18" height="18" rx="4.5" fill={nodeColor} />
        <rect
          x="22"
          y="22"
          width="18"
          height="18"
          rx="4.5"
          fill={mutedNodeColor}
          fillOpacity={isMonochrome ? 0.65 : 1}
        />
        <path
          d="M18 9h4M9 18v4M31 18v4M18 31h4"
          stroke={accentColor}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>
      <text
        x="56"
        y="31"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontSize="22"
        fontWeight="700"
        letterSpacing="-0.03em"
        fill={wordmarkColor}
      >
        Field<tspan fill={isMonochrome ? wordmarkColor : accentColor}>Sutra</tspan>
      </text>
    </svg>
  );
}
