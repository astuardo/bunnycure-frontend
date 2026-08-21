/**
 * Tipos para el módulo de Analíticas
 */

export interface AnalyticsMetrics {
  totalAppointments: number;
  totalCancelled: number;
  totalCompleted: number;
  totalPending: number;
  totalConfirmed: number;
  cancelledRate: number;        // Porcentaje de cancelación
  totalRevenue: number;         // Ingreso proyectado (demanda activa: PENDING + CONFIRMED + COMPLETED)
  completedRevenue: number;     // Ingreso efectivamente cobrado (solo COMPLETED)
  projectedRevenue: number;     // Alias explícito de totalRevenue para claridad en UI
  averageTicket: number;        // Ticket promedio sobre citas activas
  completionRate: number;       // % de citas activas que ya fueron completadas
}

export interface AppointmentByClient {
  clientId: number;
  clientName: string;
  clientPhone: string;
  appointmentCount: number;
  cancelledCount: number;
  completedCount: number;
  totalSpent: number;
  lastAppointmentDate: string | null;
}

export interface AppointmentByService {
  serviceId: number;
  serviceName: string;
  appointmentCount: number;
  totalRevenue: number;
  averagePrice: number;
}

export interface AppointmentByDay {
  date: string; // YYYY-MM-DD
  count: number;
  revenue: number;
  cancelled: number;
  completed: number;
}

export interface AppointmentsByWeekday {
  dayName: string;
  dayShort: string;
  dayIndex: number; // 1 = Lunes, ..., 7 = Domingo
  count: number;
  completedCount: number;
  revenue: number;
  percentage: number;
}

export interface AppointmentsByHourSlot {
  slotKey: string;
  slotName: string;
  timeRange: string;
  count: number;
  completedCount: number;
  revenue: number;
  percentage: number;
}

export interface CancellationReason {
  reason: string;
  count: number;
  percentage: number;
}

export interface OccupancyByHourSlot {
  slotKey: string;
  slotName: string;
  timeRange: string;
  bookedSlots: number;
  capacitySlots: number;
  occupancyRate: number; // Porcentaje de ocupación respecto a la capacidad
  status: 'OPTIMAL' | 'MODERATE' | 'OVERCAPACITY' | 'LOW';
}

export interface CancellationAlert {
  clientId: number;
  clientName: string;
  clientPhone: string;
  cancelledCount: number;
  totalAppointments: number;
  cancellationRate: number;
  lostRevenue: number;
  severity: 'WARNING' | 'CRITICAL';
  reason: string;
}

export interface AnalyticsData {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: AnalyticsMetrics;
  appointmentsByDay: AppointmentByDay[];
  appointmentsByWeekday: AppointmentsByWeekday[];
  appointmentsByHourSlot: AppointmentsByHourSlot[];
  occupancyByHourSlot: OccupancyByHourSlot[];
  cancellationAlerts: CancellationAlert[];
  topServices: AppointmentByService[];
  topClients: AppointmentByClient[];
  cancelledClients: AppointmentByClient[];
  cancellationReasons: CancellationReason[];
}
