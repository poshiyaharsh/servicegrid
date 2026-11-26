import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Card({ title, subtitle, action, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] ${className}`}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-[#64748B]">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
