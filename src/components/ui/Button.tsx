import React, { forwardRef } from 'react';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-bunny-primary hover:bg-bunny-primary-hover text-white shadow-bunny focus-visible:ring-bunny-primary active:scale-[0.99]',
  secondary:
    'bg-bunny-secondary hover:bg-bunny-secondary/90 text-white shadow-sm focus-visible:ring-bunny-secondary active:scale-[0.99]',
  outline:
    'border border-bunny-border bg-white text-bunny-text hover:bg-bunny-primary-light/50 hover:border-bunny-primary/40 focus-visible:ring-bunny-primary active:scale-[0.99]',
  danger:
    'bg-bunny-danger hover:bg-bunny-danger/90 text-white shadow-sm focus-visible:ring-bunny-danger active:scale-[0.99]',
  ghost:
    'text-bunny-text hover:bg-bunny-primary-light/60 focus-visible:ring-bunny-primary active:scale-[0.99]',
  link:
    'text-bunny-primary-dark hover:underline p-0 h-auto font-medium focus-visible:ring-bunny-primary',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-4 py-2.5 rounded-xl gap-2 font-medium',
  lg: 'text-base px-6 py-3 rounded-xl gap-2.5 font-semibold',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;
    const isLink = variant === 'link';

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center transition-all duration-150 select-none
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none
          ${!isLink ? sizeClasses[size] : ''}
          ${variantClasses[variant]}
          ${fullWidth ? 'w-full' : ''}
          ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner
              size={size === 'lg' ? 'md' : 'sm'}
              variant={variant === 'primary' || variant === 'secondary' || variant === 'danger' ? 'white' : 'primary'}
            />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
