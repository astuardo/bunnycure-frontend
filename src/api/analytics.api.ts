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
  AppointmentsByWeekday,
  AppointmentsByHourSlot,
  AppointmentByService,
  AppointmentByClient,
  CancellationReason,
} from '../types/analytics.types';
import { format, parseISO, eachDayOfInterval, getDay } from 'date-fns';
import { getAppointmentTotal, extractCancellationReason } from '../utils/appointmentUtils';

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

    const totalCompleted = appointments.filter((a) => a.status === 'COMPLETED').length;
    const completedRevenue = appointments
      .filter((a) => a.status === 'COMPLETED')
      .reduce((sum, apt) => sum + (getAppointmentTotal(apt) || 0), 0);

    // Calcular métricas principales
    const metrics: AnalyticsMetrics = {
      totalAppointments: appointments.length,
      totalCancelled: appointments.filter((a) => a.status === 'CANCELLED').length,
      totalCompleted,
      totalPending: appointments.filter((a) => a.status === 'PENDING').length,
      totalConfirmed: appointments.filter((a) => a.status === 'CONFIRMED').length,
      cancelledRate:
        appointments.length > 0
          ? Math.round((appointments.filter((a) => a.status === 'CANCELLED').length / appointments.length) * 100)
          : 0,
      totalRevenue: completedRevenue, // Enfoque en ingresos reales por citas atendidas
      completedRevenue,
      averageTicket: totalCompleted > 0 ? Math.round(completedRevenue / totalCompleted) : 0,
    };

    // 1. Citas por día (Línea de tiempo)
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
      if (apt.status === 'COMPLETED') {
        dayData.completed += 1;
        dayData.revenue += getAppointmentTotal(apt) || 0;
      }
      if (apt.status === 'CANCELLED') {
        dayData.cancelled += 1;
      }

      dayMap.set(dateStr, dayData);
    });

    const appointmentsByDay = Array.from(dayMap.values());

    // 2. Días de Mayor Demanda (Distribución Lunes a Domingo)
    const weekdayLabels = [
      { dayName: 'Lunes', dayShort: 'Lun', dayIndex: 1, jsDay: 1 },
      { dayName: 'Martes', dayShort: 'Mar', dayIndex: 2, jsDay: 2 },
      { dayName: 'Miércoles', dayShort: 'Mié', dayIndex: 3, jsDay: 3 },
      { dayName: 'Jueves', dayShort: 'Jue', dayIndex: 4, jsDay: 4 },
      { dayName: 'Viernes', dayShort: 'Vie', dayIndex: 5, jsDay: 5 },
      { dayName: 'Sábado', dayShort: 'Sáb', dayIndex: 6, jsDay: 6 },
      { dayName: 'Domingo', dayShort: 'Dom', dayIndex: 7, jsDay: 0 },
    ];

    const weekdayMap = new Map<number, { count: number; completedCount: number; revenue: number }>();
    weekdayLabels.forEach((w) => {
      weekdayMap.set(w.jsDay, { count: 0, completedCount: 0, revenue: 0 });
    });

    appointments.forEach((apt) => {
      const jsDay = getDay(parseISO(apt.appointmentDate));
      const entry = weekdayMap.get(jsDay);
      if (entry) {
        entry.count += 1;
        if (apt.status === 'COMPLETED') {
          entry.completedCount += 1;
          entry.revenue += getAppointmentTotal(apt) || 0;
        }
      }
    });

    const appointmentsByWeekday: AppointmentsByWeekday[] = weekdayLabels.map((w) => {
      const entry = weekdayMap.get(w.jsDay)!;
      return {
        dayName: w.dayName,
        dayShort: w.dayShort,
        dayIndex: w.dayIndex,
        count: entry.count,
        completedCount: entry.completedCount,
        revenue: entry.revenue,
        percentage: totalCompleted > 0 ? Math.round((entry.completedCount / totalCompleted) * 100) : 0,
      };
    });

    // 3. Franjas Horarias Pico (Mañana, Mediodía, Tarde, Noche)
    const hourSlotDefs = [
      { slotKey: 'morning', slotName: 'Mañana', timeRange: '08:00 - 11:59', minHour: 8, maxHour: 11 },
      { slotKey: 'midday', slotName: 'Mediodía', timeRange: '12:00 - 14:59', minHour: 12, maxHour: 14 },
      { slotKey: 'afternoon', slotName: 'Tarde', timeRange: '15:00 - 18:59', minHour: 15, maxHour: 18 },
      { slotKey: 'evening', slotName: 'Noche', timeRange: '19:00 - 22:00', minHour: 19, maxHour: 23 },
    ];

    const hourSlotMap = new Map<string, { count: number; completedCount: number; revenue: number }>();
    hourSlotDefs.forEach((slot) => {
      hourSlotMap.set(slot.slotKey, { count: 0, completedCount: 0, revenue: 0 });
    });

    appointments.forEach((apt) => {
      let hour = 12; // Fallback por defecto
      if (apt.appointmentTime) {
        const parts = apt.appointmentTime.split(':');
        const parsedHour = parseInt(parts[0], 10);
        if (!isNaN(parsedHour)) hour = parsedHour;
      }

      const matchingSlot = hourSlotDefs.find((s) => hour >= s.minHour && hour <= s.maxHour) || hourSlotDefs[2];
      const entry = hourSlotMap.get(matchingSlot.slotKey)!;
      entry.count += 1;
      if (apt.status === 'COMPLETED') {
        entry.completedCount += 1;
        entry.revenue += getAppointmentTotal(apt) || 0;
      }
    });

    const appointmentsByHourSlot: AppointmentsByHourSlot[] = hourSlotDefs.map((slot) => {
      const entry = hourSlotMap.get(slot.slotKey)!;
      return {
        slotKey: slot.slotKey,
        slotName: slot.slotName,
        timeRange: slot.timeRange,
        count: entry.count,
        completedCount: entry.completedCount,
        revenue: entry.revenue,
        percentage: totalCompleted > 0 ? Math.round((entry.completedCount / totalCompleted) * 100) : 0,
      };
    });

    // 4. Top Servicios (ESTRICTAMENTE CITAS COMPLETADAS)
    const serviceMap = new Map<number, AppointmentByService>();
    appointments
      .filter((a) => a.status === 'COMPLETED')
      .forEach((apt) => {
        const services = apt.services && apt.services.length > 0 ? apt.services : (apt.service ? [apt.service] : []);
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
          existing.averagePrice = Math.round(existing.totalRevenue / existing.appointmentCount);

          serviceMap.set(service.id, existing);
        });
      });

    const topServices = Array.from(serviceMap.values())
      .sort((a, b) => b.appointmentCount - a.appointmentCount || b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // 5. Top Clientes (ESTRICTAMENTE CITAS COMPLETADAS)
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
      if (apt.status === 'CANCELLED') existing.cancelledCount += 1;
      if (apt.status === 'COMPLETED') {
        existing.completedCount += 1;
        existing.totalSpent += getAppointmentTotal(apt) || 0;
      }

      if (!existing.lastAppointmentDate || apt.appointmentDate > existing.lastAppointmentDate) {
        existing.lastAppointmentDate = apt.appointmentDate;
      }

      clientMap.set(apt.customer.id, existing);
    });

    // Clasificar Top Clientes por citas completadas y luego por gasto
    const topClients = Array.from(clientMap.values())
      .filter((c) => c.completedCount > 0)
      .sort((a, b) => b.completedCount - a.completedCount || b.totalSpent - a.totalSpent)
      .slice(0, 5);

    const cancelledClients = Array.from(clientMap.values())
      .filter((c) => c.cancelledCount > 0)
      .sort((a, b) => b.cancelledCount - a.cancelledCount)
      .slice(0, 5);

    // 6. Motivos de Cancelación
    const reasonMap = new Map<string, number>();
    appointments
      .filter((apt) => apt.status === 'CANCELLED' && apt.notes)
      .forEach((apt) => {
        const match = apt.notes!.match(/Motivo:\s*(.+?)(\n|$)/i);
        if (match && match[1]) {
          const reason = match[1].trim().substring(0, 50);
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
      appointmentsByWeekday,
      appointmentsByHourSlot,
      topServices,
      topClients,
      cancelledClients,
      cancellationReasons,
    };
  },

  /**
   * Obtener tabla detallada de todas las citas canceladas
   */
  getCancelledAppointmentsDetail: async (startDate: string, endDate: string) => {
    const appointments = await apiClient
      .get<ApiResponse<Appointment[]>>('/api/appointments', {
        params: { startDate, endDate },
      })
      .then((res) => res.data.data || []);

    return appointments
      .filter((apt) => apt.status === 'CANCELLED')
      .map((apt) => ({
        id: apt.id,
        customerName: apt.customer.fullName,
        customerPhone: apt.customer.phone || '-',
        serviceName: apt.services?.[0]?.name || apt.service?.name || '-',
        appointmentDate: apt.appointmentDate,
        total: getAppointmentTotal(apt),
        cancellationReason: extractCancellationReason(apt),
        notes: apt.notes || '',
      }))
      .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
  },

  /**
   * Obtener tabla extendida de clientes con todas sus métricas ordenadas por fidelidad efectiva
   */
  getAllClientsMetrics: async (startDate: string, endDate: string) => {
    const appointments = await apiClient
      .get<ApiResponse<Appointment[]>>('/api/appointments', {
        params: { startDate, endDate },
      })
      .then((res) => res.data.data || []);

    const clientMap = new Map<
      number,
      {
        clientId: number;
        clientName: string;
        clientPhone: string;
        appointmentCount: number;
        cancelledCount: number;
        completedCount: number;
        totalSpent: number;
        averageSpent: number;
        lastAppointmentDate: string | null;
        cancellationRate: number;
      }
    >();

    appointments.forEach((apt) => {
      const existing = clientMap.get(apt.customer.id) || {
        clientId: apt.customer.id,
        clientName: apt.customer.fullName,
        clientPhone: apt.customer.phone || '',
        appointmentCount: 0,
        cancelledCount: 0,
        completedCount: 0,
        totalSpent: 0,
        averageSpent: 0,
        lastAppointmentDate: null,
        cancellationRate: 0,
      };

      existing.appointmentCount += 1;
      if (apt.status === 'CANCELLED') existing.cancelledCount += 1;
      if (apt.status === 'COMPLETED') {
        existing.completedCount += 1;
        existing.totalSpent += getAppointmentTotal(apt) || 0;
      }

      if (!existing.lastAppointmentDate || apt.appointmentDate > existing.lastAppointmentDate) {
        existing.lastAppointmentDate = apt.appointmentDate;
      }

      existing.averageSpent = existing.completedCount > 0 ? Math.round(existing.totalSpent / existing.completedCount) : 0;
      existing.cancellationRate = existing.appointmentCount > 0 ? Math.round((existing.cancelledCount / existing.appointmentCount) * 100) : 0;

      clientMap.set(apt.customer.id, existing);
    });

    return Array.from(clientMap.values()).sort(
      (a, b) => b.completedCount - a.completedCount || b.totalSpent - a.totalSpent || b.appointmentCount - a.appointmentCount
    );
  },
};
