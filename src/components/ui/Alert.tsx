import React from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiAlertTriangle, FiX } from 'react-icons/fi';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onClose?: () => void;
}

const variantConfig: Record<
  AlertVariant,
  { container: string; iconClass: string; defaultIcon: React.ReactNode }
> = {
  info: {
    container: 'bg-blue-50/90 border-blue-200 text-blue-900',
    iconClass: 'text-blue-600',
    defaultIcon: <FiInfo className="w-5 h-5 shrink-0" />,
  },
  success: {
    container: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
    iconClass: 'text-emerald-600',
    defaultIcon: <FiCheckCircle className="w-5 h-5 shrink-0" />,
  },
  warning: {
    container: 'bg-amber-50/90 border-amber-200 text-amber-900',
    iconClass: 'text-amber-600',
    defaultIcon: <FiAlertTriangle className="w-5 h-5 shrink-0" />,
  },
  danger: {
    container: 'bg-rose-50/90 border-rose-200 text-rose-900',
    iconClass: 'text-rose-600',
    defaultIcon: <FiAlertCircle className="w-5 h-5 shrink-0" />,
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  icon,
  dismissible = false,
  onClose,
  children,
  className = '',
  ...props
}) => {
  const cfg = variantConfig[variant];

  return (
    <div
      role="alert"
      className={`relative flex items-start gap-3 rounded-xl border p-4 text-sm shadow-sm transition-all ${cfg.container} ${className}`}
      {...props}
    >
      <div className={`mt-0.5 ${cfg.iconClass}`}>{icon ?? cfg.defaultIcon}</div>
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-semibold text-sm mb-1 leading-tight">{title}</h5>}
        <div className="leading-relaxed">{children}</div>
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={onClose}
          className="ml-auto -mr-1 -mt-1 p-1 rounded-lg text-current opacity-70 hover:opacity-100 transition-opacity focus:outline-none"
          aria-label="Cerrar"
        >
          <FiX className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
