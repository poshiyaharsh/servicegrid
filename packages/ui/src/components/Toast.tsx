import React from 'react';

export interface ToastProps {
  title: string;
  message?: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  onDismiss?: () => void;
}

const accentMap: Record<NonNullable<ToastProps['tone']>, string> = {
  info: 'border-l-[#0284C7]',
  success: 'border-l-[#059669]',
  warning: 'border-l-[#D97706]',
  danger: 'border-l-[#E11D48]',
};

export function Toast({ title, message, tone = 'info', onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      className={`flex items-start justify-between gap-3 rounded-lg border border-[#E2E8F0] border-l-4 bg-white p-4 shadow-md ${accentMap[tone]}`}
    >
      <div>
        <p className="text-sm font-semibold text-[#0F172A]">{title}</p>
        {message && <p className="mt-0.5 text-xs text-[#475569]">{message}</p>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="text-xs text-[#64748B] hover:text-[#0F172A]"
        >
          ✕
        </button>
      )}
    </div>
  );
}
