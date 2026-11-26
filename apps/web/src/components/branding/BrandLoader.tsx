import React from 'react';

export interface BrandLoaderProps {
  variant?: 'fullscreen' | 'button' | 'page';
  label?: string;
  className?: string;
}

function GridMark({ size = 40, dark = false }: { size?: number; dark?: boolean }) {
  const base = dark ? '#F8FAFC' : '#0F172A';
  const accent = dark ? '#14B8A6' : '#0D9488';
  const muted = dark ? '#94A3B8' : '#334155';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <g transform="translate(4, 4)">
        <rect x="0" y="0" width="18" height="18" rx="4.5" fill={base} className="fs-loader-node fs-loader-node-1" />
        <rect x="22" y="0" width="18" height="18" rx="9" fill={accent} className="fs-loader-node fs-loader-node-2" />
        <rect x="22" y="22" width="18" height="18" rx="4.5" fill={muted} className="fs-loader-node fs-loader-node-3" />
        <rect x="0" y="22" width="18" height="18" rx="4.5" fill={base} className="fs-loader-node fs-loader-node-4" />
      </g>
    </svg>
  );
}

/**
 * Custom branded loader supporting:
 * 1. Full-screen application startup loader (`fullscreen`)
 * 2. Small button loader (`button`)
 * 3. Page transition loader (`page`)
 */
export function BrandLoader({
  variant = 'fullscreen',
  label = 'Loading FieldSutra…',
  className = '',
}: BrandLoaderProps) {
  if (variant === 'button') {
    return (
      <span
        role="status"
        aria-label={label}
        className={`inline-flex items-center gap-1.5 ${className}`}
      >
        <GridMark size={16} dark />
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  if (variant === 'page') {
    return (
      <div
        role="status"
        aria-label={label}
        className={`relative w-full overflow-hidden ${className}`}
      >
        <div className="h-0.5 w-full bg-[#E2E8F0]">
          <div className="fs-page-progress-bar h-full w-2/5 bg-[#0D9488]" />
        </div>
        <div className="flex items-center justify-center gap-2.5 py-6 text-xs font-medium text-[#475569]">
          <GridMark size={20} />
          <span>{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#F8FAFC] ${className}`}
    >
      <GridMark size={52} />
      <div className="text-center">
        <p className="text-sm font-semibold tracking-tight text-[#0F172A]">FieldSutra</p>
        <p className="mt-0.5 text-xs text-[#64748B]">{label}</p>
      </div>
    </div>
  );
}
