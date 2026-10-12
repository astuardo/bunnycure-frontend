import React from 'react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'white' | 'muted' | 'current';
}

const sizeClasses = {
  xs: 'w-3 h-3 border-[1.5px]',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
};

const variantClasses = {
  primary: 'border-bunny-primary/30 border-t-bunny-primary',
  white: 'border-white/30 border-t-white',
  muted: 'border-bunny-border border-t-bunny-text-muted',
  current: 'border-current/30 border-t-current',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className = '',
  ...props
}) => {
  return (
    <div
      role="status"
      aria-label="Cargando..."
      className={`inline-block rounded-full animate-spin ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      <span className="sr-only">Cargando...</span>
    </div>
  );
};
