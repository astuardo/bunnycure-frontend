import React from 'react';

export interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  label?: string;
}

const variantClasses = {
  primary: 'bg-bunny-primary',
  secondary: 'bg-bunny-terracotta',
  accent: 'bg-bunny-accent',
  success: 'bg-bunny-sage',
  warning: 'bg-amber-500',
  danger: 'bg-bunny-danger',
};

const sizeClasses = {
  xs: 'h-1.5',
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'primary',
  size = 'sm',
  showLabel = false,
  className = '',
  label,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1 text-xs font-medium text-bunny-text">
          {label && <span>{label}</span>}
          {showLabel && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-bunny-border/50 ${sizeClasses[size]}`}>
        <div
          className={`h-full transition-all duration-300 ease-out rounded-full ${variantClasses[variant]}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
};
