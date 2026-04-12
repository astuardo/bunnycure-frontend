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
  totalAppointmentsMonth: number;
  topServices: ServiceStat[];
  topCustomer: CustomerStat | null;
}
