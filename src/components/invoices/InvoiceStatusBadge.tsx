import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { FiCheckCircle, FiClock, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface InvoiceStatusBadgeProps {
  status: string;
  className?: string;
}

export const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toUpperCase();

  switch (normalized) {
    case 'SUCCESS':
    case 'ISSUED':
    case 'COMPLETED':
      return (
        <Badge variant="success" className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold ${className}`}>
          <FiCheckCircle className="w-3.5 h-3.5" />
          <span>Emitida</span>
        </Badge>
      );

    case 'PROCESSING':
      return (
        <Badge variant="warning" className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold animate-pulse ${className}`}>
          <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Procesando</span>
        </Badge>
      );

    case 'PENDING':
      return (
        <Badge variant="neutral" className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold ${className}`}>
          <FiClock className="w-3.5 h-3.5 text-amber-500" />
          <span>Pendiente</span>
        </Badge>
      );

    case 'FAILED':
    case 'ERROR':
      return (
        <Badge variant="danger" className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold ${className}`}>
          <FiAlertTriangle className="w-3.5 h-3.5" />
          <span>Error</span>
        </Badge>
      );

    case 'DRYRUN':
    case 'MANUAL':
      return (
        <Badge variant="neutral" className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold ${className}`}>
          <span>Manual</span>
        </Badge>
      );

    default:
      return (
        <Badge variant="neutral" className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs ${className}`}>
          <span>{status}</span>
        </Badge>
      );
  }
};
