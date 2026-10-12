import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      className = '',
      containerClassName = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;

    return (
      <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-bunny-text select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-bunny-text-muted">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-bunny-text
              placeholder:text-bunny-cocoa-light/60 transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-offset-0
              disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${
                error
                  ? 'border-bunny-danger text-bunny-danger focus:border-bunny-danger focus:ring-bunny-danger/20'
                  : 'border-bunny-border hover:border-bunny-border-strong focus:border-bunny-primary focus:ring-bunny-primary/20'
              }
              ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-bunny-text-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-bunny-danger font-medium mt-0.5">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-bunny-text-muted mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
