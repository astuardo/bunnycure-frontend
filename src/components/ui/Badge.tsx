import React from 'react';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  pill?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-bunny-primary/15 text-bunny-primary-dark border-bunny-primary/30',
  secondary: 'bg-bunny-secondary/15 text-bunny-secondary border-bunny-secondary/30',
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  danger: 'bg-rose-100 text-rose-800 border-rose-200',
  warning: 'bg-amber-100 text-amber-900 border-amber-200',
  info: 'bg-purple-100 text-purple-900 border-purple-200',
  neutral: 'bg-bunny-sand text-bunny-text border-bunny-border',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  pill = true,
  className = '',
  children,
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium border ${
        pill ? 'rounded-full' : 'rounded-md'
      } ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
