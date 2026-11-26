import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-[#334155]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        className={`h-[38px] w-full rounded-md border bg-white px-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 ${
          error
            ? 'border-[#E11D48] focus:ring-[#E11D48]/30'
            : 'border-[#CBD5E1] focus:border-[#0D9488] focus:ring-[#0D9488]/25'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[#E11D48]">{error}</p>}
      {!error && hint && <p className="text-xs text-[#64748B]">{hint}</p>}
    </div>
  );
}
