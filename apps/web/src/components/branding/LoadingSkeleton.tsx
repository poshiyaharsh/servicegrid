import React from 'react';

export interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'kpi';
  rows?: number;
  className?: string;
}

/**
 * Data-loading skeleton (Loader Variant 4).
 */
export function LoadingSkeleton({
  variant = 'card',
  rows = 4,
  className = '',
}: LoadingSkeletonProps) {
  if (variant === 'kpi') {
    return (
      <div
        role="status"
        aria-label="Loading metrics"
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}
      >
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="rounded-lg border border-[#E2E8F0] bg-white p-5">
            <div className="fs-skeleton h-3 w-24 rounded" />
            <div className="fs-skeleton mt-3 h-7 w-32 rounded" />
            <div className="fs-skeleton mt-2 h-2.5 w-20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div
        role="status"
        aria-label="Loading table data"
        className={`rounded-lg border border-[#E2E8F0] bg-white p-4 ${className}`}
      >
        <div className="fs-skeleton mb-4 h-8 w-full rounded" />
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="fs-skeleton h-4 w-1/4 rounded" />
              <div className="fs-skeleton h-4 w-1/3 rounded" />
              <div className="fs-skeleton h-4 w-1/5 rounded" />
              <div className="fs-skeleton h-4 flex-1 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading content"
      className={`rounded-lg border border-[#E2E8F0] bg-white p-5 ${className}`}
    >
      <div className="fs-skeleton h-4 w-1/3 rounded" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="fs-skeleton h-3.5 w-full rounded" />
        ))}
      </div>
    </div>
  );
}
