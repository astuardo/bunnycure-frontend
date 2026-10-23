import React from 'react';
import { Button } from '@/components/ui/Button';
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';

interface InvoicePeriodSelectorProps {
  selectedPeriod: string; // Formato YYYYMM
  onPeriodChange: (newPeriod: string) => void;
  className?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const InvoicePeriodSelector: React.FC<InvoicePeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  className = '',
}) => {
  const year = parseInt(selectedPeriod.substring(0, 4), 10) || new Date().getFullYear();
  const month = parseInt(selectedPeriod.substring(4, 6), 10) || (new Date().getMonth() + 1);

  const handlePrevMonth = () => {
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    const formatted = `${newYear}${String(newMonth).padStart(2, '0')}`;
    onPeriodChange(formatted);
  };

  const handleNextMonth = () => {
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    const formatted = `${newYear}${String(newMonth).padStart(2, '0')}`;
    onPeriodChange(formatted);
  };

  const displayPeriod = `${MONTH_NAMES[month - 1] || ''} ${year}`;

  return (
    <div className={`inline-flex items-center gap-2 bg-white dark:bg-neutral-900 border border-bunny-border dark:border-neutral-800 rounded-lg p-1.5 shadow-sm ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrevMonth}
        className="p-1 h-8 w-8 text-bunny-text-muted dark:text-bunny-text-muted/70 hover:bg-bunny-sand dark:hover:bg-neutral-800"
        title="Mes anterior"
      >
        <FiChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-2 px-3 text-sm font-semibold text-bunny-text dark:text-bunny-text-muted/70 min-w-[140px] justify-center">
        <FiCalendar className="w-4 h-4 text-primary-500" />
        <span>{displayPeriod}</span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleNextMonth}
        className="p-1 h-8 w-8 text-bunny-text-muted dark:text-bunny-text-muted/70 hover:bg-bunny-sand dark:hover:bg-neutral-800"
        title="Mes siguiente"
      >
        <FiChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};
