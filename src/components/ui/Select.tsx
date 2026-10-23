import React, { forwardRef, useId } from 'react';
import { FiChevronDown } from 'react-icons/fi';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      id,
      className = '',
      containerClassName = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const selectId = id || props.name || autoId;
    const messageId = error || helperText ? `${selectId}-message` : undefined;

    return (
      <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-bunny-text select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={messageId}
            className={`w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm text-bunny-text
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-offset-0
              disabled:bg-bunny-paper disabled:text-bunny-text-muted/70 disabled:cursor-not-allowed
              ${
                error
                  ? 'border-bunny-danger text-bunny-danger focus:border-bunny-danger focus:ring-bunny-danger/20'
                  : 'border-bunny-border hover:border-bunny-border-strong focus:border-bunny-primary focus:ring-bunny-primary/20'
              }
              ${className}`}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute right-3.5 flex items-center text-bunny-text-muted">
            <FiChevronDown className="h-4 w-4" />
          </div>
        </div>
        {error ? (
          <p id={messageId} role="alert" className="text-xs text-bunny-danger font-medium mt-0.5">{error}</p>
        ) : helperText ? (
          <p id={messageId} className="text-xs text-bunny-text-muted mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
