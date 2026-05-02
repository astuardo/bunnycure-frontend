/**
 * API de Analíticas - procesa datos de citas para métricas de negocio
 */

import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { Appointment } from '../types/appointment.types';
import {
  AnalyticsData,
  AnalyticsMetrics,
  AppointmentByDay,
  AppointmentByService,
  AppointmentByClient,
  CancellationReason,
} from '../types/analytics.types';
import { format, parseISO, eachDayOfInterval } from 'date-fns';

export const analyticsApi = {
  /**
   * Obtener datos de analíticas procesando appointments del backend
   */
  getAnalytics: async (startDate: string, endDate: string): Promise<AnalyticsData> => {
    // Obtener todas las citas en el rango
    const appointments = await apiClient
      .get<ApiResponse<Appointment[]>>('/api/appointments', {
        params: { startDate, endDate },
      })
      .then((res) => res.data.data || []);

    // Calcular métricas
    const metrics: AnalyticsMetrics = {
      totalAppointments: appointments.length,
      totalCancelled: appointments.filter((a) => a.status === 'CANCELLED').length,
      totalCompleted: appointments.filter((a) => a.status === 'COMPLETED').length,
      totalPending: appointments.filter((a) => a.status === 'PENDING').length,
      totalConfirmed: appointments.filter((a) => a.status === 'CONFIRMED').length,
      cancelledRate:
        appointments.length > 0
          ? Math.round((appointments.filter((a) => a.status === 'CANCELLED').length / appointments.length) * 100)
          : 0,
      totalRevenue: appointments.reduce((sum, apt) => sum + (getAppointmentTotal(apt) || 0), 0),
    };

    // Citas por día
    const dayMap = new Map<string, AppointmentByDay>();
    const startObj = parseISO(startDate);
    const endObj = parseISO(endDate);
    const daysInRange = eachDayOfInterval({ start: startObj, end: endObj });

    daysInRange.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      dayMap.set(dateStr, {
        date: dateStr,
        count: 0,
        revenue: 0,
        cancelled: 0,
        completed: 0,
      });
    });

    appointments.forEach((apt) => {
      const dateStr = format(parseISO(apt.appointmentDate), 'yyyy-MM-dd');
      const dayData = dayMap.get(dateStr) || {
        date: dateStr,
        count: 0,
        revenue: 0,
        cancelled: 0,
        completed: 0,
      };

      dayData.count += 1;
      dayData.revenue += getAppointmentTotal(apt) || 0;
      if (apt.status === 'CANCELLED') dayData.cancelled += 1;
      if (apt.status === 'COMPLETED') dayData.completed += 1;

      dayMap.set(dateStr, dayData);
    });

    const appointmentsByDay = Array.from(dayMap.values());

    // Top servicios
    const serviceMap = new Map<number, AppointmentByService>();
    appointments.forEach((apt) => {
      const services = apt.services || (apt.service ? [apt.service] : []);
      services.forEach((service) => {
        const existing = serviceMap.get(service.id) || {
          serviceId: service.id,
          serviceName: service.name,
          appointmentCount: 0,
          totalRevenue: 0,
          averagePrice: 0,
        };

        existing.appointmentCount += 1;
        existing.totalRevenue += service.price;
        existing.averagePrice = existing.totalRevenue / existing.appointmentCount;

        serviceMap.set(service.id, existing);
      });
    });

    const topServices = Array.from(serviceMap.values())
      .sort((a, b) => b.appointmentCount - a.appointmentCount)
      .slice(0, 5);

    // Top clientes
    const clientMap = new Map<number, AppointmentByClient>();
    appointments.forEach((apt) => {
      const existing = clientMap.get(apt.customer.id) || {
        clientId: apt.customer.id,
        clientName: apt.customer.fullName,
        clientPhone: apt.customer.phone || '',
        appointmentCount: 0,
        cancelledCount: 0,
        completedCount: 0,
        totalSpent: 0,
        lastAppointmentDate: null,
      };

      existing.appointmentCount += 1;
      existing.totalSpent += getAppointmentTotal(apt) || 0;

      if (apt.status === 'CANCELLED') existing.cancelledCount += 1;
      if (apt.status === 'COMPLETED') existing.completedCount += 1;

      if (!existing.lastAppointmentDate || apt.appointmentDate > existing.lastAppointmentDate) {
        existing.lastAppointmentDate = apt.appointmentDate;
      }

      clientMap.set(apt.customer.id, existing);
    });

    const topClients = Array.from(clientMap.values())
      .sort((a, b) => b.appointmentCount - a.appointmentCount)
      .slice(0, 5);

    const cancelledClients = Array.from(clientMap.values())
      .filter((c) => c.cancelledCount > 0)
      .sort((a, b) => b.cancelledCount - a.cancelledCount)
      .slice(0, 5);

    // Motivos de cancelación
    const reasonMap = new Map<string, number>();
    appointments
      .filter((apt) => apt.status === 'CANCELLED' && apt.notes)
      .forEach((apt) => {
        const match = apt.notes!.match(/Motivo:\s*(.+?)(\n|$)/i);
        if (match && match[1]) {
          const reason = match[1].trim().substring(0, 50); // Primeros 50 chars
          reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
        }
      });

    const totalCancelled = appointments.filter((a) => a.status === 'CANCELLED').length;
    const cancellationReasons: CancellationReason[] = Array.from(reasonMap.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: totalCancelled > 0 ? Math.round((count / totalCancelled) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      dateRange: { startDate, endDate },
      metrics,
      appointmentsByDay,
      topServices,
      topClients,
      cancelledClients,
      cancellationReasons,
    };
  },
};

/**
 * Función auxiliar para calcular total de cita (duplicada de AppointmentsPage)
 */
function getAppointmentTotal(apt: Appointment): number {
  if (apt.notes) {
    const match = apt.notes.match(/Total final estimado:\s*\$?\s*([\d.]+)/i);
    if (match && match[1]) {
      const parsedTotal = parseInt(match[1].replace(/\./g, ''), 10);
      if (!isNaN(parsedTotal) && parsedTotal > 0) return parsedTotal;
    }
  }

  if (typeof apt.totalPrice === 'number' && apt.totalPrice > 0) return apt.totalPrice;

  const services = apt.services || (apt.service ? [apt.service] : []);
  return services.reduce((sum, service) => sum + service.price, 0);
}
