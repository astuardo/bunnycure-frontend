/**
 * Utilidades para exportar datos a CSV
 */

import Papa from 'papaparse';

export interface ExportOptions {
  filename: string;
  headers: string[];
  data: any[];
}

/**
 * Exporta datos a CSV y descarga el archivo
 */
export const exportToCSV = (options: ExportOptions) => {
  const { filename, headers, data } = options;

  const csv = Papa.unparse({
    fields: headers,
    data: data.map((row) => {
      const newRow: any = {};
      headers.forEach((header) => {
        newRow[header] = row[header] || '';
      });
      return newRow;
    }),
  });

  // Agregar BOM para UTF-8 (Excel reconoce tildes correctamente)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exporta reporte ejecutivo integral de analíticas con todas las secciones clave
 */
export const exportFullAnalyticsReport = (
  analyticsData: any,
  specialistsData: any[],
  filename: string
) => {
  const lines: string[] = [];
  const addSection = (title: string) => {
    lines.push('');
    lines.push(`=== ${title.toUpperCase()} ===`);
  };

  // 1. Resumen Ejecutivo
  addSection('Resumen Ejecutivo de Rendimiento');
  lines.push('Métrica,Valor');
  lines.push(`Período,${analyticsData.dateRange.startDate} al ${analyticsData.dateRange.endDate}`);
  lines.push(`Citas Totales Agendadas,${analyticsData.metrics.totalAppointments}`);
  lines.push(`Citas Completadas,${analyticsData.metrics.totalCompleted}`);
  lines.push(`Citas Confirmadas,${analyticsData.metrics.totalConfirmed}`);
  lines.push(`Citas Pendientes,${analyticsData.metrics.totalPending}`);
  lines.push(`Citas Canceladas,${analyticsData.metrics.totalCancelled}`);
  lines.push(`Tasa de Cancelación,${analyticsData.metrics.cancelledRate}%`);
  lines.push(`Tasa de Efectividad/Completación,${analyticsData.metrics.completionRate}%`);
  lines.push(`Ingreso Proyectado Total,$${analyticsData.metrics.totalRevenue.toLocaleString('es-CL')}`);
  lines.push(`Ingreso Cobrado Efectivo,$${analyticsData.metrics.completedRevenue.toLocaleString('es-CL')}`);
  lines.push(`Ticket Promedio,$${analyticsData.metrics.averageTicket.toLocaleString('es-CL')}`);

  // 2. Demanda por Día de la Semana
  if (analyticsData.appointmentsByWeekday?.length) {
    addSection('Demanda por Día de la Semana');
    lines.push('Día,Citas Agendadas,Completadas,% del Período,Ingresos Estimados');
    analyticsData.appointmentsByWeekday.forEach((w: any) => {
      lines.push(`"${w.dayName}",${w.count},${w.completedCount},${w.percentage}%,$${w.revenue.toLocaleString('es-CL')}`);
    });
  }

  // 3. Ocupación por Franja Horaria
  if (analyticsData.occupancyByHourSlot?.length) {
    addSection('Ocupación y Franjas Horarias');
    lines.push('Franja,Horario,Citas Agendadas,Capacidad Estimada,% Ocupación,Estado');
    analyticsData.occupancyByHourSlot.forEach((o: any) => {
      lines.push(`"${o.slotName}","${o.timeRange}",${o.bookedSlots},${o.capacitySlots},${o.occupancyRate}%,${o.status}`);
    });
  }

  // 4. Rendimiento por Especialista
  if (specialistsData?.length) {
    addSection('Rendimiento por Especialista');
    lines.push('Especialista,Citas Asignadas,Completadas,Canceladas,% Efectividad,Recaudación Generada');
    specialistsData.forEach((s: any) => {
      lines.push(`"${s.specialistName}",${s.totalCount},${s.completedCount},${s.cancelledCount},${s.completionRate || 0}%,$${s.revenue.toLocaleString('es-CL')}`);
    });
  }

  // 5. Top Servicios
  if (analyticsData.topServices?.length) {
    addSection('Top Servicios Más Demandados');
    lines.push('Servicio,Citas Agendadas,Facturación Estimada,Precio Promedio');
    analyticsData.topServices.forEach((s: any) => {
      lines.push(`"${s.serviceName}",${s.appointmentCount},$${s.totalRevenue.toLocaleString('es-CL')},$${s.averagePrice.toLocaleString('es-CL')}`);
    });
  }

  const BOM = '\uFEFF';
  const csvContent = lines.join('\r\n');
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
