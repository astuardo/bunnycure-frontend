/**
 * Utilidades para Cálculo y Exportación de Cierre de Caja Diario y Mensual
 */

import { format, isSameDay, isSameMonth, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Appointment } from '../types/appointment.types';
import { getAppointmentTotal } from './appointmentUtils';
import { exportToCSV } from './exportUtils';
import {
  CashClosingPeriodType,
  CashClosingSummary,
  CashClosingTransaction,
  PaymentBreakdownItem,
} from '../types/cashClosing.types';

/**
 * Normaliza y extrae la fecha de una cita
 */
const parseAppointmentDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const iso = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
  const parsed = new Date(iso);
  return isValid(parsed) ? parsed : null;
};

/**
 * Detecta el método de pago desde las notas de la cita
 */
export const detectPaymentMethod = (notes?: string): string => {
  if (!notes) return 'Efectivo / Transferencia';
  const lower = notes.toLowerCase();

  if (lower.includes('giftcard') || lower.includes('gift card') || lower.includes('tarjeta de regalo')) {
    return 'GiftCard';
  }
  if (lower.includes('transferencia') || lower.includes('transf') || lower.includes('banco') || lower.includes('cuenta rut')) {
    return 'Transferencia';
  }
  if (lower.includes('débito') || lower.includes('debito') || lower.includes('redcompra') || lower.includes('pos') || lower.includes('tarjeta')) {
    return 'Tarjeta Débito / POS';
  }
  if (lower.includes('crédito') || lower.includes('credito')) {
    return 'Tarjeta Crédito';
  }
  if (lower.includes('efectivo') || lower.includes('cash')) {
    return 'Efectivo';
  }

  // Regex para líneas explícitas como "Método de Pago: Transferencia"
  const match = notes.match(/M[eé]todo(?: de pago)?:\s*([^\n,]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  return 'Efectivo / Transferencia';
};

/**
 * Detecta si se emitió boleta electrónica en la cita
 */
export const detectHasInvoice = (notes?: string): boolean => {
  if (!notes) return false;
  const lower = notes.toLowerCase();
  return (
    lower.includes('boleta: sí') ||
    lower.includes('boleta: si') ||
    lower.includes('boleta emitida') ||
    lower.includes('boleta generada') ||
    lower.includes('boleta:')
  );
};

/**
 * Extrae o estima el costo de materiales e insumos utilizados en la cita
 */
export const extractSuppliesCost = (apt: Appointment): number => {
  if (apt.notes) {
    const match = apt.notes.match(/Costo (?:Materiales|Insumos):\s*\$?([0-9.]+)/i);
    if (match && match[1]) {
      const parsed = parseFloat(match[1].replace(/\./g, ''));
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  // Estimación razonable basada en precio base de servicios (12% aprox en manicure)
  const total = getAppointmentTotal(apt);
  return Math.round(total * 0.12);
};

/**
 * Calcula el Cierre de Caja completo para un día o mes seleccionado
 */
export const calculateCashClosing = (
  appointments: Appointment[],
  targetDate: Date,
  periodType: CashClosingPeriodType
): CashClosingSummary => {
  const filteredAppointments = appointments.filter((apt) => {
    const aptDate = parseAppointmentDate(apt.appointmentDate);
    if (!aptDate) return false;

    if (periodType === 'DAILY') {
      return isSameDay(aptDate, targetDate);
    } else {
      return isSameMonth(aptDate, targetDate);
    }
  });

  const totalAppointments = filteredAppointments.length;
  const completedAppointmentsList = filteredAppointments.filter((a) => a.status === 'COMPLETED');
  const cancelledAppointmentsList = filteredAppointments.filter((a) => a.status === 'CANCELLED');

  const completedCount = completedAppointmentsList.length;
  const cancelledCount = cancelledAppointmentsList.length;

  let grossRevenue = 0;
  let estimatedSuppliesCost = 0;
  let invoicesCount = 0;
  let invoicesTotalAmount = 0;

  const paymentMap: Record<string, { count: number; total: number }> = {};
  const transactions: CashClosingTransaction[] = [];

  // Procesar solo citas completadas para los cálculos financieros
  completedAppointmentsList.forEach((apt) => {
    const price = getAppointmentTotal(apt);
    const cost = extractSuppliesCost(apt);
    const profit = Math.max(price - cost, 0);
    const hasInvoice = detectHasInvoice(apt.notes);
    const method = detectPaymentMethod(apt.notes);

    grossRevenue += price;
    estimatedSuppliesCost += cost;

    if (hasInvoice) {
      invoicesCount++;
      invoicesTotalAmount += price;
    }

    if (!paymentMap[method]) {
      paymentMap[method] = { count: 0, total: 0 };
    }
    paymentMap[method].count += 1;
    paymentMap[method].total += price;

    const services =
      apt.services && apt.services.length > 0
        ? apt.services.map((s) => s.name)
        : apt.service
        ? [apt.service.name]
        : ['Servicio de Manicure'];

    transactions.push({
      appointmentId: apt.id,
      appointmentDate: apt.appointmentDate.slice(0, 10),
      appointmentTime: apt.appointmentTime || '00:00',
      customerName: (apt.customer as any)?.fullName || (apt.customer as any)?.name || 'Clienta',
      customerRut: (apt.customer as any)?.rut || '',
      customerPhone: apt.customer?.phone || '',
      serviceNames: services,
      totalPrice: price,
      hasInvoice,
      paymentMethod: method,
      estimatedMaterialsCost: cost,
      netProfit: profit,
      status: apt.status,
    });
  });

  // Ordenar transacciones por hora
  transactions.sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));

  const netProfit = Math.max(grossRevenue - estimatedSuppliesCost, 0);
  const grossMarginPercentage = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;
  const averageTicket = completedCount > 0 ? Math.round(grossRevenue / completedCount) : 0;

  // Convertir mapa de pagos a array con porcentaje
  const paymentBreakdown: PaymentBreakdownItem[] = Object.entries(paymentMap).map(([methodName, data]) => ({
    methodName,
    count: data.count,
    totalAmount: data.total,
    percentage: grossRevenue > 0 ? Math.round((data.total / grossRevenue) * 100) : 0,
  }));

  // Ordenar métodos de pago por monto descendente
  paymentBreakdown.sort((a, b) => b.totalAmount - a.totalAmount);

  const dateFormattedLabel =
    periodType === 'DAILY'
      ? format(targetDate, "EEEE d 'de' MMMM, yyyy", { locale: es })
      : format(targetDate, "MMMM 'de' yyyy", { locale: es });

  return {
    periodType,
    selectedDate: format(targetDate, periodType === 'DAILY' ? 'yyyy-MM-dd' : 'yyyy-MM'),
    dateFormattedLabel: dateFormattedLabel.charAt(0).toUpperCase() + dateFormattedLabel.slice(1),
    totalAppointments,
    completedAppointments: completedCount,
    cancelledAppointments: cancelledCount,
    grossRevenue,
    estimatedSuppliesCost,
    netProfit,
    grossMarginPercentage,
    averageTicket,
    invoicesCount,
    invoicesTotalAmount,
    paymentBreakdown,
    transactions,
  };
};

/**
 * Exporta el Cierre de Caja a formato CSV para Excel
 */
export const exportCashClosingToCSV = (summary: CashClosingSummary) => {
  const headers = [
    'ID Cita',
    'Fecha',
    'Hora',
    'Clienta',
    'RUT',
    'Teléfono',
    'Servicios',
    'Método de Pago',
    'Boleta Emitida',
    'Ingreso Bruto ($)',
    'Costo Insumos ($)',
    'Utilidad Neta ($)',
  ];

  const data = summary.transactions.map((t) => ({
    'ID Cita': t.appointmentId,
    Fecha: t.appointmentDate,
    Hora: t.appointmentTime,
    Clienta: t.customerName,
    RUT: t.customerRut || 'No informado',
    Teléfono: t.customerPhone || 'No informado',
    Servicios: t.serviceNames.join(' + '),
    'Método de Pago': t.paymentMethod,
    'Boleta Emitida': t.hasInvoice ? 'SÍ' : 'NO',
    'Ingreso Bruto ($)': t.totalPrice,
    'Costo Insumos ($)': t.estimatedMaterialsCost,
    'Utilidad Neta ($)': t.netProfit,
  }));

  const prefix = summary.periodType === 'DAILY' ? 'cierre-caja-diario' : 'cierre-caja-mensual';
  exportToCSV({
    filename: `${prefix}-${summary.selectedDate}`,
    headers,
    data,
  });
};
