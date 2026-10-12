/**
 * Página de Analíticas - Dashboard con métricas de negocio
 */

import { useEffect, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  Users,
  AlertCircle,
  Download,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle2,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import DashboardLayout from '@/components/common/DashboardLayout';
import { analyticsApi } from '@/api/analytics.api';
import { AnalyticsData } from '@/types/analytics.types';
import { useToast } from '@/hooks/useToast';
import {
  format,
  parseISO,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';
import { exportToCSV, exportFullAnalyticsReport } from '@/utils/exportUtils';
import { getAppointmentTotal } from '@/utils/appointmentUtils';
import { CashClosingModal } from '@/components/finances/CashClosingModal';
import { useAppointmentsStore } from '@/stores/appointmentsStore';
import { statsApi } from '../../api/stats.api';
import { SpecialistStat } from '../../types/stats.types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

const formatCurrency = (value: number) => `$${value.toLocaleString('es-CL')}`;

type PresetKey = 'today' | 'last7' | 'thisMonth' | 'lastMonth' | 'last90' | 'thisYear' | 'custom';

export default function AnalyticsPage() {
  const toast = useToast();
  const { appointments, fetchAppointments } = useAppointmentsStore();
  const [startDate, setStartDate] = useState<string>(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [cancelledDetail, setCancelledDetail] = useState<any[]>([]);
  const [clientsMetrics, setClientsMetrics] = useState<any[]>([]);
  const [specialistsStats, setSpecialistsStats] = useState<SpecialistStat[]>([]);
  const [showCashClosing, setShowCashClosing] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<PresetKey>('thisMonth');

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const specialistPerformance = useMemo(() => {
    if (specialistsStats && specialistsStats.length > 0) {
      return specialistsStats;
    }

    // Fallback de resiliencia: calcular localmente desde las citas
    const map = new Map<string, SpecialistStat>();
    appointments.forEach((apt) => {
      if (!apt.appointmentDate || apt.appointmentDate < startDate || apt.appointmentDate > endDate) return;
      const name = apt.specialistName || 'Sin asignar / General';
      const current = map.get(name) || {
        specialistName: name,
        totalCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        revenue: 0,
        completionRate: 0,
      };

      current.totalCount++;
      if (apt.status === 'COMPLETED') {
        current.completedCount++;
        current.revenue += getAppointmentTotal(apt);
      } else if (apt.status === 'CANCELLED') {
        current.cancelledCount++;
      }

      map.set(name, current);
    });

    return Array.from(map.values())
      .map((item) => {
        const active = item.totalCount - item.cancelledCount;
        item.completionRate = active > 0 ? Math.round((item.completedCount / active) * 100) : 0;
        return item;
      })
      .sort((a, b) => b.completedCount - a.completedCount || b.revenue - a.revenue);
  }, [specialistsStats, appointments, startDate, endDate]);

  const loadAnalytics = async (overrideStart?: string, overrideEnd?: string) => {
    const sDate = overrideStart || startDate;
    const eDate = overrideEnd || endDate;

    setLoading(true);
    try {
      const [result, cancelled, clients, specialists] = await Promise.all([
        analyticsApi.getAnalytics(sDate, eDate),
        analyticsApi.getCancelledAppointmentsDetail(sDate, eDate),
        analyticsApi.getAllClientsMetrics(sDate, eDate),
        statsApi.getSpecialistStats(sDate, eDate).catch(() => []),
      ]);

      setData(result);
      setCancelledDetail(cancelled);
      setClientsMetrics(clients);
      setSpecialistsStats(specialists);
    } catch (error) {
      toast.error('Error al cargar analíticas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: PresetKey) => {
    const today = new Date();
    let newStart = startDate;
    let newEnd = endDate;

    switch (preset) {
      case 'today':
        newStart = format(today, 'yyyy-MM-dd');
        newEnd = format(today, 'yyyy-MM-dd');
        break;
      case 'last7':
        newStart = format(subDays(today, 6), 'yyyy-MM-dd');
        newEnd = format(today, 'yyyy-MM-dd');
        break;
      case 'thisMonth':
        newStart = format(startOfMonth(today), 'yyyy-MM-dd');
        newEnd = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
      case 'lastMonth': {
        const lastMonthDate = subMonths(today, 1);
        newStart = format(startOfMonth(lastMonthDate), 'yyyy-MM-dd');
        newEnd = format(endOfMonth(lastMonthDate), 'yyyy-MM-dd');
        break;
      }
      case 'last90':
        newStart = format(subDays(today, 89), 'yyyy-MM-dd');
        newEnd = format(today, 'yyyy-MM-dd');
        break;
      case 'thisYear':
        newStart = format(startOfYear(today), 'yyyy-MM-dd');
        newEnd = format(endOfYear(today), 'yyyy-MM-dd');
        break;
      default:
        break;
    }

    setStartDate(newStart);
    setEndDate(newEnd);
    setActivePreset(preset);

    if (preset !== 'custom') {
      loadAnalytics(newStart, newEnd);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const PAGE_BG = '#fdf0ec';
  const TEXT_DARK = '#5c3d2e';
  const TEXT_MID = '#9e7b6e';

  if (!data) {
    return (
      <DashboardLayout>
        <div style={{ padding: '20px', minHeight: '100vh', background: PAGE_BG }}>
          <div className="flex justify-center items-center py-24">
            <Spinner size="lg" variant="primary" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const {
    metrics,
    appointmentsByDay,
    appointmentsByWeekday,
    appointmentsByHourSlot,
    topServices,
    topClients,
    cancelledClients,
    cancellationReasons,
  } = data;

  const MetricCard = ({ label, value, subtext, icon: Icon, color }: any) => (
    <div
      style={{
        background: 'rgba(255,255,255,0.92)',
        borderRadius: '18px',
        padding: '18px',
        textAlign: 'center',
        border: `1px solid ${color}35`,
        boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <div
          style={{
            background: `${color}15`,
            borderRadius: '50%',
            padding: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={24} style={{ color }} />
        </div>
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: TEXT_DARK, marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: TEXT_MID, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
        {label}
      </div>
      {subtext && (
        <div style={{ fontSize: '11px', color: TEXT_MID, marginTop: '4px' }}>
          {subtext}
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="bunny-page" style={{ minHeight: '100vh', background: PAGE_BG, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Encabezado y Filtros Rápidos */}
        <div
          style={{
            background: 'rgba(255,255,255,0.92)',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 2px 12px rgba(180, 120, 100, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#f8d7da', padding: '10px', borderRadius: '14px' }}>
                <BarChart3 size={26} style={{ color: '#c9897a' }} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: TEXT_DARK }}>
                  Analíticas y Rendimiento
                </h1>
                <small style={{ color: TEXT_MID }}>Métricas de productividad, clientas y servicios completados</small>
              </div>
            </div>

            {/* Acciones y Selector de Rango Personalizado */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  exportFullAnalyticsReport(data, specialistPerformance, `informe-ejecutivo-${startDate}-${endDate}`);
                  toast.success('Informe ejecutivo descargado exitosamente');
                }}
                leftIcon={<Download size={16} />}
              >
                📄 Informe Ejecutivo
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCashClosing(true)}
                leftIcon={<DollarSign size={16} />}
                className="text-rose-900 border-rose-200 bg-rose-50/50 hover:bg-rose-100/50"
              >
                💰 Cierre de Caja & Finanzas
              </Button>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-32 text-xs rounded-xl border border-rose-200 px-2 py-1.5 bg-white text-stone-700"
                />
                <span style={{ color: TEXT_MID, fontSize: '13px' }}>a</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-32 text-xs rounded-xl border border-rose-200 px-2 py-1.5 bg-white text-stone-700"
                />
                <Button
                  variant="primary"
                  onClick={() => loadAnalytics()}
                  disabled={loading}
                  size="sm"
                  isLoading={loading}
                >
                  Filtrar
                </Button>
              </div>
            </div>
          </div>

          {/* Botones de Presets de Fecha */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #f2e4de', paddingTop: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_MID, marginRight: '4px' }}>
              Período rápido:
            </span>
            {[
              { key: 'today', label: 'Hoy' },
              { key: 'last7', label: 'Últimos 7 días' },
              { key: 'thisMonth', label: 'Este Mes' },
              { key: 'lastMonth', label: 'Mes Anterior' },
              { key: 'last90', label: 'Últimos 90 días' },
              { key: 'thisYear', label: 'Este Año' },
            ].map((p) => {
              const isSelected = activePreset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key as PresetKey)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                    isSelected
                      ? 'bg-amber-950 text-white shadow-sm font-semibold'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tarjetas de Métricas Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <div>
            <MetricCard
              label="Citas Totales"
              value={metrics.totalAppointments}
              subtext={`${metrics.totalConfirmed} conf. • ${metrics.totalPending} pend.`}
              icon={Calendar}
              color="#5a8f7b"
            />
          </div>
          <div>
            <MetricCard
              label="Completadas"
              value={metrics.totalCompleted}
              subtext={`${metrics.completionRate}% de efectividad`}
              icon={CheckCircle2}
              color="#28a745"
            />
          </div>
          <div>
            <MetricCard
              label="Tasa Cancelación"
              value={`${metrics.cancelledRate}%`}
              subtext={`${metrics.totalCancelled} canceladas`}
              icon={AlertCircle}
              color="#dc3545"
            />
          </div>
          <div>
            <MetricCard
              label="Ingreso Proyectado"
              value={formatCurrency(metrics.totalRevenue)}
              subtext="Demanda activa total"
              icon={TrendingUp}
              color="#1976d2"
            />
          </div>
          <div>
            <MetricCard
              label="Ingresos Cobrados"
              value={formatCurrency(metrics.completedRevenue)}
              subtext="Solo citas completadas"
              icon={DollarSign}
              color="#2e7d32"
            />
          </div>
          <div>
            <MetricCard
              label="Ticket Promedio"
              value={formatCurrency(metrics.averageTicket)}
              subtext="Gasto medio por cita activa"
              icon={Sparkles}
              color="#c9897a"
            />
          </div>
        </div>

        {/* Banner de Proyecciones & Insights Predictivos de Demanda */}
        {(() => {
          const peakWeekday = [...appointmentsByWeekday].sort((a, b) => (b.count - a.count) || (b.completedCount - a.completedCount))[0];
          const peakSlot = [...appointmentsByHourSlot].sort((a, b) => (b.count - a.count) || (b.completedCount - a.completedCount))[0];
          const effectiveness = metrics.completionRate;

          return (
            <div
              style={{
                background: 'linear-gradient(135deg, #fff9f6 0%, #fdf0ec 100%)',
                border: '1px solid #f2cfc2',
                borderRadius: '16px',
                padding: '16px 20px',
                boxShadow: '0 2px 8px rgba(180, 120, 100, 0.08)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-amber-500" />
                <span className="font-bold" style={{ color: TEXT_DARK, fontSize: '15px' }}>
                  🔮 Insights &amp; Proyecciones de Demanda del Salón
                </span>
                <div className="ml-auto">
                  <Badge variant="success">
                    {effectiveness}% Efectividad
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="p-2.5 rounded-xl bg-white border border-rose-100 shadow-2xs">
                    <strong>📅 Día Pico de Demanda:</strong>{' '}
                    <span className="text-blue-600 font-semibold">
                      {peakWeekday && peakWeekday.count > 0
                        ? `${peakWeekday.dayName} (${peakWeekday.count} citas • ${peakWeekday.completedCount} completadas)`
                        : 'Sin datos suficientes'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="p-2.5 rounded-xl bg-white border border-rose-100 shadow-2xs">
                    <strong>⏰ Franja Horaria de Mayor Flujo:</strong>{' '}
                    <span className="text-emerald-600 font-semibold">
                      {peakSlot && peakSlot.count > 0
                        ? `${peakSlot.slotName} ${peakSlot.timeRange} (${peakSlot.count} citas)`
                        : 'Sin datos suficientes'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="p-2.5 rounded-xl bg-white border border-rose-100 shadow-2xs">
                    <strong>🎯 Optimización de Turnos:</strong>{' '}
                    <span className="text-stone-800">
                      {peakWeekday && peakWeekday.count > 0
                        ? `Reforzar disponibilidad los días ${peakWeekday.dayName} durante la franja de la ${peakSlot?.slotName?.toLowerCase() || 'tarde'}.`
                        : 'Continúa registrando citas para obtener sugerencias automáticas.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 🚨 Alertas Inteligentes de Cancelación & Clientes en Riesgo */}
        {data.cancellationAlerts && data.cancellationAlerts.length > 0 && (
          <div
            style={{
              background: '#fff8f7',
              border: '1px solid #fecaca',
              borderRadius: '16px',
              padding: '16px 20px',
              boxShadow: '0 2px 8px rgba(220, 53, 69, 0.08)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={20} className="text-red-500" />
              <span className="font-bold text-red-900 text-sm">
                🚨 Alertas de Retención: Clientas con Alto Patrón de Cancelación
              </span>
              <div className="ml-auto">
                <Badge variant="danger">
                  {data.cancellationAlerts.length} en seguimiento
                </Badge>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
              {data.cancellationAlerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.clientId}
                  style={{
                    background: '#ffffff',
                    border: alert.severity === 'CRITICAL' ? '1px solid #f87171' : '1px solid #fed7aa',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '12px',
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <strong style={{ color: TEXT_DARK, fontSize: '13px' }}>{alert.clientName}</strong>
                    <Badge variant={alert.severity === 'CRITICAL' ? 'danger' : 'warning'}>
                      {alert.severity === 'CRITICAL' ? 'Alto Riesgo' : 'Atención'}
                    </Badge>
                  </div>
                  <div style={{ color: TEXT_MID, fontSize: '11px', marginBottom: '4px' }}>
                    Tel: {alert.clientPhone || 'No registrado'}
                  </div>
                  <div style={{ color: '#7f1d1d', fontWeight: 600 }}>
                    {alert.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fila 1 de Gráficos: Línea de tiempo & Distribución de Estados */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Citas por Día */}
          <div className="lg:col-span-7" style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                Evolución de Citas por Día
              </h5>
              <Badge variant="neutral">
                {appointmentsByDay.length} días
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={270}>
              <LineChart data={appointmentsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f2e4de" />
                <XAxis dataKey="date" stroke={TEXT_MID} fontSize={11} tickFormatter={(val) => val.slice(5)} />
                <YAxis stroke={TEXT_MID} fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fffdfb', borderColor: '#d4a89a', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="count" stroke="#8c6b5d" name="Total Agendadas" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completed" stroke="#28a745" name="Completadas" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cancelled" stroke="#dc3545" name="Canceladas" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Estado de Citas */}
          <div className="lg:col-span-5" style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
            <h5 style={{ color: TEXT_DARK, fontWeight: 700, marginBottom: '16px', fontSize: '15px' }}>
              Distribución de Estados
            </h5>
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completadas', value: metrics.totalCompleted },
                    { name: 'Confirmadas', value: metrics.totalConfirmed },
                    { name: 'Pendientes', value: metrics.totalPending },
                    { name: 'Canceladas', value: metrics.totalCancelled },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => (value > 0 ? `${name}: ${value}` : '')}
                  outerRadius={85}
                  dataKey="value"
                >
                  {['#28a745', '#ffc107', '#17a2b8', '#dc3545'].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fffdfb', borderColor: '#d4a89a', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fila 2 de Gráficos: Días de Mayor Demanda y Franjas Horarias */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Días de Mayor Demanda */}
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Calendar size={18} style={{ color: '#c9897a' }} />
              <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                Días de Mayor Demanda (Semanal)
              </h5>
            </div>
            <small style={{ color: TEXT_MID, display: 'block', marginBottom: '12px' }}>
              Distribución de citas por día para identificar días pico y de alta demanda
            </small>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={appointmentsByWeekday}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f2e4de" />
                <XAxis dataKey="dayShort" stroke={TEXT_MID} fontSize={12} />
                <YAxis stroke={TEXT_MID} fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fffdfb', borderColor: '#d4a89a', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any, name: any, item: any) => {
                    if (name === 'Completadas') {
                      return [`${value} citas (${item.payload.percentage}% del total)`, name];
                    }
                    return [`${value} citas`, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="completedCount" fill="#5a8f7b" name="Completadas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="count" fill="#e0cfc7" name="Total Agendado" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Horarios Pico & Tasa de Ocupación por Franja */}
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} style={{ color: '#c9897a' }} />
                <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                  Franjas Horarias &amp; Ocupación
                </h5>
              </div>
            </div>
            <small style={{ color: TEXT_MID, display: 'block', marginBottom: '12px' }}>
              Capacidad instalada y porcentaje de ocupación estimada
            </small>

            {/* Indicadores rápidos de ocupación */}
            {data.occupancyByHourSlot && data.occupancyByHourSlot.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '14px' }}>
                {data.occupancyByHourSlot.map((occ) => {
                  const badgeVariant: 'danger' | 'success' | 'warning' | 'neutral' =
                    occ.status === 'OVERCAPACITY' ? 'danger' : occ.status === 'OPTIMAL' ? 'success' : occ.status === 'MODERATE' ? 'warning' : 'neutral';
                  const badgeText = occ.status === 'OVERCAPACITY' ? 'Alta' : occ.status === 'OPTIMAL' ? 'Óptima' : occ.status === 'MODERATE' ? 'Media' : 'Baja';
                  return (
                    <div key={occ.slotKey} style={{ background: '#fdf8f6', border: '1px solid #f2e4de', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: TEXT_DARK }}>{occ.slotName}</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#5a8f7b' }}>{occ.occupancyRate}%</div>
                      <Badge variant={badgeVariant}>{badgeText}</Badge>
                    </div>
                  );
                })}
              </div>
            )}

            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={appointmentsByHourSlot}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f2e4de" />
                <XAxis dataKey="slotName" stroke={TEXT_MID} fontSize={12} />
                <YAxis stroke={TEXT_MID} fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fffdfb', borderColor: '#d4a89a', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any, name: any, item: any) => {
                    if (name === 'Completadas') {
                      return [`${value} citas (${item.payload.percentage}% del total)`, name];
                    }
                    return [`${value} citas`, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="completedCount" fill="#c9897a" name="Completadas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="count" fill="#f0d5ca" name="Total Agendado" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fila 3 de Gráficos: Top Servicios & Ingresos por Servicio */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Servicios */}
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Sparkles size={18} style={{ color: '#c9897a' }} />
              <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                Top 5 Servicios Más Demandados
              </h5>
            </div>
            <small style={{ color: TEXT_MID, display: 'block', marginBottom: '16px' }}>
              Servicios más solicitados en el período (demanda activa)
            </small>
            {topServices.length === 0 ? (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs">
                No hay citas registradas en este período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topServices}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f2e4de" />
                  <XAxis dataKey="serviceName" stroke={TEXT_MID} fontSize={11} angle={-25} textAnchor="end" height={60} />
                  <YAxis stroke={TEXT_MID} fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fffdfb', borderColor: '#d4a89a', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="appointmentCount" fill="#5a8f7b" name="Citas Activas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Ingresos por Servicio */}
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <DollarSign size={18} style={{ color: '#2e7d32' }} />
              <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                Ingresos por Servicio
              </h5>
            </div>
            <small style={{ color: TEXT_MID, display: 'block', marginBottom: '16px' }}>
              Facturación generada y proyectada por servicios
            </small>
            {topServices.length === 0 ? (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs">
                No hay datos de ingresos en este período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topServices}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f2e4de" />
                  <XAxis dataKey="serviceName" stroke={TEXT_MID} fontSize={11} angle={-25} textAnchor="end" height={60} />
                  <YAxis stroke={TEXT_MID} fontSize={12} tickFormatter={(val) => `$${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fffdfb', borderColor: '#d4a89a', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: any) => [formatCurrency(value as number), 'Ingresos']}
                  />
                  <Bar dataKey="totalRevenue" fill="#c9897a" name="Ingresos" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tablas de Resumen */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Clientes */}
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#5a8f7b' }} />
                Top 5 Clientas Más Activas
              </h5>
              <Badge variant="primary">Demanda Activa</Badge>
            </div>
            {topClients.length === 0 ? (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs">
                No hay clientas con citas en este período
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f2e4de' }}>
                      <th style={{ textAlign: 'left', padding: '8px', fontWeight: 700, color: TEXT_DARK }}>
                        Clienta
                      </th>
                      <th style={{ textAlign: 'center', padding: '8px', fontWeight: 700, color: '#28a745' }}>
                        Atendidas
                      </th>
                      <th style={{ textAlign: 'right', padding: '8px', fontWeight: 700, color: TEXT_DARK }}>
                        Gasto Real
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClients.map((client) => (
                      <tr key={client.clientId} style={{ borderBottom: '1px solid #f8ede8' }}>
                        <td style={{ padding: '10px 8px', color: TEXT_DARK }}>
                          <div style={{ fontWeight: 600 }}>{client.clientName}</div>
                          <small style={{ color: TEXT_MID }}>{client.clientPhone}</small>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#28a745', fontWeight: 700 }}>
                          {client.completedCount}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#5a8f7b', fontWeight: 700 }}>
                          {formatCurrency(client.totalSpent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Clientes que Cancelan */}
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                <AlertCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#dc3545' }} />
                Clientas con Mayor Cancelación
              </h5>
              <Badge variant="danger">Canceladas</Badge>
            </div>
            {cancelledClients.length === 0 ? (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs">
                No hay cancelaciones en este período
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f2e4de' }}>
                      <th style={{ textAlign: 'left', padding: '8px', fontWeight: 700, color: TEXT_DARK }}>
                        Clienta
                      </th>
                      <th style={{ textAlign: 'center', padding: '8px', fontWeight: 700, color: '#dc3545' }}>
                        Canceladas
                      </th>
                      <th style={{ textAlign: 'center', padding: '8px', fontWeight: 700, color: TEXT_DARK }}>
                        Tasa
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cancelledClients.map((client) => (
                      <tr key={client.clientId} style={{ borderBottom: '1px solid #f8ede8' }}>
                        <td style={{ padding: '10px 8px', color: TEXT_DARK }}>
                          <div style={{ fontWeight: 600 }}>{client.clientName}</div>
                          <small style={{ color: TEXT_MID }}>{client.clientPhone}</small>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#dc3545', fontWeight: 700 }}>
                          {client.cancelledCount}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: TEXT_MID, fontWeight: 600 }}>
                          {client.appointmentCount > 0
                            ? `${Math.round((client.cancelledCount / client.appointmentCount) * 100)}%`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Motivos de Cancelación */}
        <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
          <h5 style={{ color: TEXT_DARK, fontWeight: 700, marginBottom: '14px', fontSize: '15px' }}>
            Motivos de Cancelación Frecuentes
          </h5>
          {cancellationReasons.length === 0 ? (
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs">
              No se registran motivos de cancelación en este período
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f2e4de' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Motivo Declarado
                    </th>
                    <th style={{ textAlign: 'center', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Frecuencia
                    </th>
                    <th style={{ textAlign: 'right', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Porcentaje
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cancellationReasons.slice(0, 10).map((reason, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f8ede8' }}>
                      <td style={{ padding: '10px', color: TEXT_DARK }}>{reason.reason}</td>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#dc3545', fontWeight: 600 }}>
                        {reason.count}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: TEXT_MID, fontWeight: 600 }}>
                        {reason.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tabla Detallada de Cancelaciones con CSV */}
        <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
              <AlertCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#dc3545' }} />
              Detalle de Cancelaciones
            </h5>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={() => {
                exportToCSV({
                  filename: `reporte-cancelaciones-${startDate}-${endDate}`,
                  headers: ['Cliente', 'Teléfono', 'Servicio', 'Fecha', 'Monto', 'Origen', 'Motivo'],
                  data: cancelledDetail.map((item) => ({
                    'Cliente': item.customerName,
                    'Teléfono': item.customerPhone,
                    'Servicio': item.serviceName,
                    'Fecha': format(parseISO(item.appointmentDate), 'dd/MM/yyyy'),
                    'Monto': `$${item.total.toLocaleString('es-CL')}`,
                    'Origen': item.cancellationInitiator === 'MANICURIST' ? 'Manicurista / Salón' : item.cancellationInitiator === 'CUSTOMER' ? 'Clienta' : 'Sin especificar',
                    'Motivo': item.cancellationReason,
                  })),
                });
                toast.success('Reporte descargado exitosamente');
              }}
            >
              Descargar CSV
            </Button>
          </div>

          {cancelledDetail.length === 0 ? (
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs">
              No hay cancelaciones registradas en este período
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fdf6f3', borderBottom: '1px solid #f2e4de' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Clienta
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Teléfono
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Servicio
                    </th>
                    <th style={{ textAlign: 'center', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Fecha
                    </th>
                    <th style={{ textAlign: 'right', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Monto
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Origen
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Motivo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cancelledDetail.slice(0, 20).map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f8ede8' }}>
                      <td style={{ padding: '10px', color: TEXT_DARK, fontWeight: 600 }}>
                        {item.customerName}
                      </td>
                      <td style={{ padding: '10px', color: TEXT_MID, fontSize: '11px' }}>
                        {item.customerPhone}
                      </td>
                      <td style={{ padding: '10px', color: TEXT_DARK }}>{item.serviceName}</td>
                      <td style={{ padding: '10px', textAlign: 'center', color: TEXT_DARK, fontSize: '11px' }}>
                        {format(parseISO(item.appointmentDate), 'dd/MM/yyyy')}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#dc3545', fontWeight: 600 }}>
                        ${item.total.toLocaleString('es-CL')}
                      </td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                        {item.cancellationInitiator === 'MANICURIST' ? (
                          <span
                            style={{
                              background: '#ffedd5',
                              color: '#9a3412',
                              border: '1px solid #fed7aa',
                              borderRadius: '999px',
                              padding: '2px 8px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            💅 Manicurista
                          </span>
                        ) : item.cancellationInitiator === 'CUSTOMER' ? (
                          <span
                            style={{
                              background: '#f1f5f9',
                              color: '#475569',
                              border: '1px solid #e2e8f0',
                              borderRadius: '999px',
                              padding: '2px 8px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            👤 Clienta
                          </span>
                        ) : (
                          <span style={{ color: TEXT_MID, fontSize: '11px' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px', color: TEXT_MID, fontSize: '11px' }}>
                        {item.cancellationReason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {cancelledDetail.length > 20 && (
                <div style={{ marginTop: '12px', color: TEXT_MID, fontSize: '12px' }}>
                  Mostrando las primeras 20 de {cancelledDetail.length} cancelaciones. Descarga el CSV para el informe completo.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rendimiento & Atenciones por Especialista */}
        <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                <Sparkles size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#c9897a' }} />
                💅 Rendimiento &amp; Atenciones por Especialista
              </h5>
              <small style={{ color: TEXT_MID }}>Métricas operativas y recaudación generada por manicurista en el período</small>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={() => {
                exportToCSV({
                  filename: `rendimiento-especialistas-${startDate}-${endDate}`,
                  headers: ['Especialista', 'Citas Asignadas', 'Completadas', 'Canceladas', 'Recaudación Estimada'],
                  data: specialistPerformance.map((item) => ({
                    'Especialista': item.specialistName,
                    'Citas Asignadas': item.totalCount,
                    'Completadas': item.completedCount,
                    'Canceladas': item.cancelledCount,
                    'Recaudación Estimada': `$${item.revenue.toLocaleString('es-CL')}`,
                  })),
                });
                toast.success('Informe de especialistas descargado');
              }}
            >
              Descargar CSV
            </Button>
          </div>

          {specialistPerformance.length === 0 ? (
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs">
              No hay citas registradas con especialistas en este período
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fdf6f3', borderBottom: '1px solid #f2e4de' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Especialista / Manicurista
                    </th>
                    <th style={{ textAlign: 'center', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Citas Asignadas
                    </th>
                    <th style={{ textAlign: 'center', padding: '10px', fontWeight: 700, color: '#28a745' }}>
                      Completadas
                    </th>
                    <th style={{ textAlign: 'center', padding: '10px', fontWeight: 700, color: '#dc3545' }}>
                      Canceladas
                    </th>
                    <th style={{ textAlign: 'center', padding: '10px', fontWeight: 700, color: '#1976d2' }}>
                      % Efectividad
                    </th>
                    <th style={{ textAlign: 'right', padding: '10px', fontWeight: 700, color: '#5a8f7b' }}>
                      Recaudación Generada
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {specialistPerformance.map((spec, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f8ede8' }}>
                      <td style={{ padding: '10px', color: TEXT_DARK, fontWeight: 600 }}>
                        {spec.specialistName}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', color: TEXT_DARK }}>
                        {spec.totalCount}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#28a745', fontWeight: 700 }}>
                        {spec.completedCount}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', color: spec.cancelledCount > 0 ? '#dc3545' : TEXT_MID }}>
                        {spec.cancelledCount}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#1976d2', fontWeight: 600 }}>
                        {spec.completionRate}%
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#5a8f7b', fontWeight: 700 }}>
                        ${spec.revenue.toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ranking Completo de Clientas con CSV */}
        <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#5a8f7b' }} />
                Ranking Completo de Clientas (Por Citas Atendidas)
              </h5>
              <small style={{ color: TEXT_MID }}>Clasificadas por número de citas efectivamente completadas</small>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={() => {
                exportToCSV({
                  filename: `ranking-clientas-${startDate}-${endDate}`,
                  headers: ['Clienta', 'Teléfono', 'Citas Totales', 'Completadas', 'Canceladas', 'Tasa Cancelación', 'Gasto Real', 'Promedio'],
                  data: clientsMetrics.map((item) => ({
                    'Clienta': item.clientName,
                    'Teléfono': item.clientPhone,
                    'Citas Totales': item.appointmentCount,
                    'Completadas': item.completedCount,
                    'Canceladas': item.cancelledCount,
                    'Tasa Cancelación': `${item.cancellationRate}%`,
                    'Gasto Real': `$${item.totalSpent.toLocaleString('es-CL')}`,
                    'Promedio': `$${item.averageSpent.toLocaleString('es-CL')}`,
                  })),
                });
                toast.success('Ranking descargado exitosamente');
              }}
            >
              Descargar CSV
            </Button>
          </div>

          {clientsMetrics.length === 0 ? (
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs">
              No hay registros de clientas en este período
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fdf6f3', borderBottom: '1px solid #f2e4de' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Clienta
                    </th>
                    <th style={{ textAlign: 'center', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Totales
                    </th>
                    <th style={{ textAlign: 'center', padding: '10px', fontWeight: 700, color: '#28a745' }}>
                      Completadas
                    </th>
                    <th style={{ textAlign: 'center', padding: '10px', fontWeight: 700, color: '#dc3545' }}>
                      Canceladas
                    </th>
                    <th style={{ textAlign: 'center', padding: '10px', fontWeight: 700, color: '#dc3545' }}>
                      % Cancel.
                    </th>
                    <th style={{ textAlign: 'right', padding: '10px', fontWeight: 700, color: TEXT_DARK }}>
                      Gasto Real
                    </th>
                    <th style={{ textAlign: 'right', padding: '10px', fontWeight: 700, color: TEXT_MID }}>
                      Promedio/Cita
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientsMetrics.slice(0, 15).map((client) => (
                    <tr key={client.clientId} style={{ borderBottom: '1px solid #f8ede8' }}>
                      <td style={{ padding: '10px', color: TEXT_DARK, fontWeight: 600 }}>
                        <div>{client.clientName}</div>
                        <small style={{ color: TEXT_MID, fontSize: '10px' }}>{client.clientPhone}</small>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', color: TEXT_DARK }}>
                        {client.appointmentCount}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#28a745', fontWeight: 700 }}>
                        {client.completedCount}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', color: client.cancelledCount > 0 ? '#dc3545' : TEXT_MID, fontWeight: client.cancelledCount > 0 ? 600 : 400 }}>
                        {client.cancelledCount}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', color: client.cancellationRate > 30 ? '#dc3545' : TEXT_MID }}>
                        {client.cancellationRate}%
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#5a8f7b', fontWeight: 700 }}>
                        ${client.totalSpent.toLocaleString('es-CL')}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: TEXT_MID }}>
                        ${client.averageSpent.toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clientsMetrics.length > 15 && (
                <div style={{ marginTop: '12px', color: TEXT_MID, fontSize: '12px' }}>
                  Mostrando las primeras 15 de {clientsMetrics.length} clientas. Descarga el CSV para consultar el ranking completo.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cierre de Caja & Finanzas */}
      <CashClosingModal show={showCashClosing} onHide={() => setShowCashClosing(false)} />
    </DashboardLayout>
  );
}
