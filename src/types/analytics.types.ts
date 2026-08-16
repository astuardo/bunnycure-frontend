/**
 * Tipos para el módulo de Analíticas
 */

export interface AnalyticsMetrics {
  totalAppointments: number;
  totalCancelled: number;
  totalCompleted: number;
  totalPending: number;
  totalConfirmed: number;
  cancelledRate: number; // Porcentaje
  totalRevenue: number;
  completedRevenue: number;
  averageTicket: number;
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

export interface AnalyticsData {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: AnalyticsMetrics;
  appointmentsByDay: AppointmentByDay[];
  appointmentsByWeekday: AppointmentsByWeekday[];
  appointmentsByHourSlot: AppointmentsByHourSlot[];
  topServices: AppointmentByService[];
  topClients: AppointmentByClient[];
  cancelledClients: AppointmentByClient[];
  cancellationReasons: CancellationReason[];
}
