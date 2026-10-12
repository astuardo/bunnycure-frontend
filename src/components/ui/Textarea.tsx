import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      id,
      className = '',
      containerClassName = '',
      disabled,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const textareaId = id || props.name;

    return (
      <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-bunny-text select-none">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          rows={rows}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-bunny-text
            placeholder:text-bunny-cocoa-light/60 transition-all duration-150 resize-y
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
            ${
              error
                ? 'border-bunny-danger text-bunny-danger focus:border-bunny-danger focus:ring-bunny-danger/20'
                : 'border-bunny-border hover:border-bunny-border-strong focus:border-bunny-primary focus:ring-bunny-primary/20'
            }
            ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-xs text-bunny-danger font-medium mt-0.5">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-bunny-text-muted mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
