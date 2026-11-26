import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'teal' | 'success' | 'warning' | 'danger';
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]',
  teal: 'bg-[#F0FDFA] text-[#0F766E] border-[#CCFBF1]',
  success: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
  warning: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
  danger: 'bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]',
};

export function Badge({ tone = 'neutral', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
