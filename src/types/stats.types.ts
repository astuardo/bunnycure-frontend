/**
 * Tipos para las analíticas y estadísticas del Dashboard.
 */

export interface ServiceStat {
  name: string;
  count: number;
  revenue: number;
}

export interface CustomerStat {
  name: string;
  appointmentCount: number;
  totalSpent: number;
}

export interface DashboardStats {
  totalRevenueMonth: number;
  completedRevenueMonth?: number;
  projectedRevenueMonth?: number;
  totalAppointmentsMonth: number;
  completedAppointmentsMonth?: number;
  pendingOrConfirmedAppointmentsMonth?: number;
  topServices: ServiceStat[];
  topCustomer: CustomerStat | null;
}

export interface TodayOperationalStats {
  date: string;
  totalAppointments: number;
  completedCount: number;
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
  inProgressOrUpcoming2HoursCount: number;
  potentialNoShowCount: number;
  collectedRevenue: number;
  projectedRevenue: number;
  completionRate: number;
  nextAppointmentTime?: string;
  nextCustomerName?: string;
  nextServiceName?: string;
  nextSpecialistName?: string;
}

export interface SpecialistStat {
  specialistId?: number;
  specialistName: string;
  totalCount: number;
  completedCount: number;
  cancelledCount: number;
  revenue: number;
  completionRate: number;
}
