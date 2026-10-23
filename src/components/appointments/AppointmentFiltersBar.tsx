import React from 'react';
import { Button } from '@/components/ui';
import { FaSearch, FaTimes, FaCalendarAlt, FaCalendarDay, FaSyncAlt } from 'react-icons/fa';
import { format, addDays } from 'date-fns';
import { AppointmentStatus } from '../../types/appointment.types';

export type AppointmentStatusFilter = AppointmentStatus | 'ACTIVE' | 'ALL';

interface AppointmentFiltersBarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  dateFilter: string;
  onDateFilterChange: (date: string) => void;
  statusFilter: AppointmentStatusFilter;
  onStatusFilterChange: (status: AppointmentStatusFilter) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isLoading: boolean;
}

export const AppointmentFiltersBar: React.FC<AppointmentFiltersBarProps> = ({
  searchQuery,
  onSearchQueryChange,
  dateFilter,
  onDateFilterChange,
  statusFilter,
  onStatusFilterChange,
  onApplyFilters,
  onClearFilters,
  isLoading,
}) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
      {/* Buscador de texto */}
      <div className="sm:col-span-2 lg:col-span-4">
        <label htmlFor="appointment-filters-bar-buscar-cita" className="text-xs font-bold text-bunny-text-muted mb-1.5 flex items-center gap-1.5">
          <FaSearch className="text-bunny-mid" /> Buscar cita
        </label>
        <div className="relative">
          <input id="appointment-filters-bar-buscar-cita"
            type="text"
            placeholder="Clienta, RUT, teléfono, servicio o notas..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full rounded-xl border border-bunny-border px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-bunny-paper/50 hover:bg-white focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bunny-text-muted/70 hover:text-bunny-text-muted p-1"
              onClick={() => onSearchQueryChange('')}
              title="Limpiar búsqueda"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Selector de Fecha */}
      <div className="sm:col-span-1 lg:col-span-3">
        <label htmlFor="appointment-filters-bar-fecha" className="text-xs font-bold text-bunny-text-muted mb-1.5 flex items-center gap-1.5">
          <FaCalendarAlt className="text-bunny-mid" /> Fecha
        </label>
        <input id="appointment-filters-bar-fecha"
          type="date"
          value={dateFilter}
          onChange={(e) => onDateFilterChange(e.target.value)}
          className="w-full rounded-xl border border-bunny-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-bunny-paper/50 hover:bg-white focus:bg-white transition-colors"
        />
        <div className="flex gap-1.5 mt-2">
          <Button
            size="sm"
            variant={dateFilter === todayStr ? 'primary' : 'outline'}
            className="py-0.5 px-2 text-xs"
            onClick={() => onDateFilterChange(todayStr)}
          >
            Hoy
          </Button>
          <Button
            size="sm"
            variant={dateFilter === tomorrowStr ? 'primary' : 'outline'}
            className="py-0.5 px-2 text-xs"
            onClick={() => onDateFilterChange(tomorrowStr)}
          >
            Mañana
          </Button>
          {dateFilter && (
            <Button
              size="sm"
              variant="danger"
              className="py-0.5 px-2 text-xs"
              onClick={() => onDateFilterChange('')}
            >
              Todas
            </Button>
          )}
        </div>
      </div>

      {/* Selector de Estado */}
      <div className="sm:col-span-1 lg:col-span-3">
        <label htmlFor="appointment-filters-bar-estado" className="text-xs font-bold text-bunny-text-muted mb-1.5 flex items-center gap-1.5">
          <FaCalendarDay className="text-bunny-mid" /> Estado
        </label>
        <select id="appointment-filters-bar-estado"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as AppointmentStatusFilter)}
          className="w-full rounded-xl border border-bunny-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-bunny-paper/50 hover:bg-white focus:bg-white transition-colors"
        >
          <option value="ACTIVE">⚡ Pendientes, confirmadas y reprogramar</option>
          <option value="ALL">📋 Todas las citas</option>
          <option value={AppointmentStatus.PENDING}>⏳ Pendiente</option>
          <option value={AppointmentStatus.CONFIRMED}>✅ Confirmada</option>
          <option value={AppointmentStatus.RESCHEDULE_REQUESTED}>🔄 Reprogramar</option>
          <option value={AppointmentStatus.COMPLETED}>🎉 Completada</option>
          <option value={AppointmentStatus.CANCELLED}>❌ Cancelada</option>
        </select>
      </div>

      {/* Botones de acción */}
      <div className="sm:col-span-2 lg:col-span-2 flex items-end gap-2">
        <Button
          variant="primary"
          className="flex-1 flex items-center justify-center gap-1 text-sm py-2"
          onClick={onApplyFilters}
          title="Actualizar citas desde el servidor"
        >
          <FaSyncAlt className={isLoading ? 'animate-spin' : ''} />
          <span>Filtrar</span>
        </Button>
        <Button
          variant="outline"
          className="shrink-0 text-sm py-2 px-3"
          onClick={onClearFilters}
          title="Restablecer todos los filtros"
          aria-label="Limpiar filtros"
        >
          <FaTimes />
        </Button>
      </div>
    </div>
  );
};
