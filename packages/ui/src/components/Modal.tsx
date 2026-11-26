import React from 'react';

export interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, title, description, onClose, children, footer }: ModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fs-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1120]/55 p-4"
    >
      <div className="w-full max-w-lg rounded-xl border border-[#E2E8F0] bg-white shadow-lg">
        <div className="flex items-start justify-between border-b border-[#E2E8F0] px-5 py-4">
          <div>
            <h2 id="fs-modal-title" className="text-base font-semibold text-[#0F172A]">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-[#64748B]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-md p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[#E2E8F0] px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
