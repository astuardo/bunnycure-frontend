/**
 * Página de Analíticas - Dashboard con métricas de negocio
 */

import { useEffect, useState } from 'react';
import { Row, Col, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
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
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';
import { exportToCSV } from '@/utils/exportUtils';

const formatCurrency = (value: number) => `$${value.toLocaleString('es-CL')}`;

type PresetKey = 'today' | 'last7' | 'thisMonth' | 'lastMonth' | 'last90' | 'thisYear' | 'custom';

export default function AnalyticsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [cancelledDetail, setCancelledDetail] = useState<any[]>([]);
  const [clientsMetrics, setClientsMetrics] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [activePreset, setActivePreset] = useState<PresetKey>('thisMonth');

  const loadAnalytics = async (overrideStart?: string, overrideEnd?: string) => {
    const sDate = overrideStart || startDate;
    const eDate = overrideEnd || endDate;

    setLoading(true);
    try {
      const result = await analyticsApi.getAnalytics(sDate, eDate);
      setData(result);

      // Cargar datos complementarios
      const cancelled = await analyticsApi.getCancelledAppointmentsDetail(sDate, eDate);
      const clients = await analyticsApi.getAllClientsMetrics(sDate, eDate);
      setCancelledDetail(cancelled);
      setClientsMetrics(clients);
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
        newStart = format(subDays(today, 7), 'yyyy-MM-dd');
        newEnd = format(today, 'yyyy-MM-dd');
        break;
      case 'thisMonth':
        newStart = format(startOfMonth(today), 'yyyy-MM-dd');
        newEnd = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
      case 'lastMonth': {
        const prevMonthDate = subMonths(today, 1);
        newStart = format(startOfMonth(prevMonthDate), 'yyyy-MM-dd');
        newEnd = format(endOfMonth(prevMonthDate), 'yyyy-MM-dd');
        break;
      }
      case 'last90':
        newStart = format(subDays(today, 90), 'yyyy-MM-dd');
        newEnd = format(today, 'yyyy-MM-dd');
        break;
      case 'thisYear':
        newStart = format(startOfYear(today), 'yyyy-MM-dd');
        newEnd = format(endOfYear(today), 'yyyy-MM-dd');
        break;
      case 'custom':
      default:
        break;
    }

    setActivePreset(preset);
    setStartDate(newStart);
    setEndDate(newEnd);
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
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="danger">
              <span className="visually-hidden">Cargando...</span>
            </Spinner>
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
      <div style={{ minHeight: '100vh', background: PAGE_BG, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

            {/* Selector de Rango Personalizado */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Form.Control
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('custom');
                }}
                style={{ width: '135px', fontSize: '13px', borderRadius: '8px' }}
              />
              <span style={{ color: TEXT_MID, fontSize: '13px' }}>a</span>
              <Form.Control
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('custom');
                }}
                style={{ width: '135px', fontSize: '13px', borderRadius: '8px' }}
              />
              <Button
                variant="primary"
                onClick={() => loadAnalytics()}
                disabled={loading}
                size="sm"
                style={{ background: '#c9897a', borderColor: '#c9897a', borderRadius: '8px', padding: '6px 14px' }}
              >
                {loading ? 'Cargando...' : 'Filtrar'}
              </Button>
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
                <Button
                  key={p.key}
                  variant={isSelected ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={() => applyPreset(p.key as PresetKey)}
                  style={{
                    fontSize: '12px',
                    borderRadius: '20px',
                    padding: '4px 12px',
                    background: isSelected ? '#5c3d2e' : 'transparent',
                    borderColor: isSelected ? '#5c3d2e' : '#e0cfc7',
                    color: isSelected ? '#ffffff' : TEXT_DARK,
                    fontWeight: isSelected ? 600 : 500,
                  }}
                >
                  {p.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Tarjetas de Métricas Principales */}
        <Row className="g-3">
          <Col xs={12} sm={6} lg={4} xl={2}>
            <MetricCard
              label="Citas Totales"
              value={metrics.totalAppointments}
              subtext={`${metrics.totalConfirmed} conf. • ${metrics.totalPending} pend.`}
              icon={Calendar}
              color="#5a8f7b"
            />
          </Col>
          <Col xs={12} sm={6} lg={4} xl={2}>
            <MetricCard
              label="Completadas"
              value={metrics.totalCompleted}
              subtext="Atendidas efectivamente"
              icon={CheckCircle2}
              color="#28a745"
            />
          </Col>
          <Col xs={12} sm={6} lg={4} xl={2}>
            <MetricCard
              label="Tasa Cancelación"
              value={`${metrics.cancelledRate}%`}
              subtext={`${metrics.totalCancelled} canceladas`}
              icon={AlertCircle}
              color="#dc3545"
            />
          </Col>
          <Col xs={12} sm={6} lg={4} xl={3}>
            <MetricCard
              label="Ingresos Realizados"
              value={formatCurrency(metrics.completedRevenue)}
              subtext="Solo de citas completadas"
              icon={DollarSign}
              color="#2e7d32"
            />
          </Col>
          <Col xs={12} sm={6} lg={4} xl={3}>
            <MetricCard
              label="Ticket Promedio"
              value={formatCurrency(metrics.averageTicket)}
              subtext="Gasto medio por cita realizada"
              icon={TrendingUp}
              color="#c9897a"
            />
          </Col>
        </Row>

        {/* Banner de Proyecciones & Insights Predictivos de Demanda */}
        {(() => {
          const peakWeekday = [...appointmentsByWeekday].sort((a, b) => b.completedCount - a.completedCount)[0];
          const peakSlot = [...appointmentsByHourSlot].sort((a, b) => b.completedCount - a.completedCount)[0];
          const totalAtendidas = metrics.totalCompleted;
          const effectiveness = metrics.totalAppointments > 0 ? Math.round((totalAtendidas / metrics.totalAppointments) * 100) : 0;

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
              <div className="d-flex align-items-center gap-2 mb-2">
                <Sparkles size={18} className="text-warning" />
                <span className="fw-bold" style={{ color: TEXT_DARK, fontSize: '15px' }}>
                  🔮 Insights &amp; Proyecciones de Demanda del Salón
                </span>
                <Badge bg="success" className="ms-auto" style={{ fontSize: '11px' }}>
                  {effectiveness}% Efectividad
                </Badge>
              </div>
              <Row className="g-2 small">
                <Col md={4}>
                  <div className="p-2 rounded bg-white border border-peach">
                    <strong>📅 Día Pico de Atención:</strong>{' '}
                    <span className="text-primary fw-semibold">
                      {peakWeekday && peakWeekday.completedCount > 0
                        ? `${peakWeekday.dayName} (${peakWeekday.completedCount} citas - ${peakWeekday.percentage}%)`
                        : 'Sin datos suficientes'}
                    </span>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="p-2 rounded bg-white border border-peach">
                    <strong>⏰ Franja Horaria de Mayor Flujo:</strong>{' '}
                    <span className="text-success fw-semibold">
                      {peakSlot && peakSlot.completedCount > 0
                        ? `${peakSlot.slotName} ${peakSlot.timeRange} (${peakSlot.percentage}%)`
                        : 'Sin datos suficientes'}
                    </span>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="p-2 rounded bg-white border border-peach">
                    <strong>🎯 Optimización de Turnos:</strong>{' '}
                    <span className="text-dark">
                      {peakWeekday && peakWeekday.completedCount > 0
                        ? `Reforzar disponibilidad los días ${peakWeekday.dayName} durante la franja de la ${peakSlot?.slotName?.toLowerCase() || 'tarde'}.`
                        : 'Continúa registrando citas completadas para obtener sugerencias automáticas.'}
                    </span>
                  </div>
                </Col>
              </Row>
            </div>
          );
        })()}

        {/* Fila 1 de Gráficos: Línea de tiempo & Distribución de Estados */}
        <Row className="g-3">
          {/* Citas por Día */}
          <Col xs={12} lg={7}>
            <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                  Evolución de Citas por Día
                </h5>
                <Badge bg="light" text="dark" style={{ border: '1px solid #e0cfc7', fontWeight: 500 }}>
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
          </Col>

          {/* Estado de Citas */}
          <Col xs={12} lg={5}>
            <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
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
          </Col>
        </Row>

        {/* Fila 2 de Gráficos (NUEVAS ANALÍTICAS): Días de Mayor Demanda y Franjas Horarias */}
        <Row className="g-3">
          {/* Días de Mayor Demanda */}
          <Col xs={12} lg={6}>
            <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Calendar size={18} style={{ color: '#c9897a' }} />
                <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                  Días de Mayor Demanda (Semanal)
                </h5>
              </div>
              <small style={{ color: TEXT_MID, display: 'block', marginBottom: '12px' }}>
                Citas completadas distribuidas por día para identificar días pico y lentos
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
          </Col>

          {/* Horarios Pico de Atención */}
          <Col xs={12} lg={6}>
            <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Clock size={18} style={{ color: '#c9897a' }} />
                <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                  Franjas Horarias Pico
                </h5>
              </div>
              <small style={{ color: TEXT_MID, display: 'block', marginBottom: '12px' }}>
                Concentración de clientas por bloques horarios de atención
              </small>
              <ResponsiveContainer width="100%" height={260}>
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
          </Col>
        </Row>

        {/* Fila 3 de Gráficos: Top Servicios & Ingresos por Servicio */}
        <Row className="g-3">
          {/* Top Servicios */}
          <Col xs={12} lg={6}>
            <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Sparkles size={18} style={{ color: '#c9897a' }} />
                <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                  Top 5 Servicios (Citas Completadas)
                </h5>
              </div>
              <small style={{ color: TEXT_MID, display: 'block', marginBottom: '16px' }}>
                Servicios realizados y cobrados con éxito
              </small>
              {topServices.length === 0 ? (
                <Alert variant="info" style={{ fontSize: '12px' }}>
                  No hay citas completadas en este período
                </Alert>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topServices}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f2e4de" />
                    <XAxis dataKey="serviceName" stroke={TEXT_MID} fontSize={11} angle={-25} textAnchor="end" height={60} />
                    <YAxis stroke={TEXT_MID} fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#fffdfb', borderColor: '#d4a89a', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="appointmentCount" fill="#5a8f7b" name="Citas Completadas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Col>

          {/* Ingresos por Servicio */}
          <Col xs={12} lg={6}>
            <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <DollarSign size={18} style={{ color: '#2e7d32' }} />
                <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                  Ingresos por Servicio Realizado
                </h5>
              </div>
              <small style={{ color: TEXT_MID, display: 'block', marginBottom: '16px' }}>
                Facturación generada por servicios completados
              </small>
              {topServices.length === 0 ? (
                <Alert variant="info" style={{ fontSize: '12px' }}>
                  No hay datos de ingresos completados en este período
                </Alert>
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
          </Col>
        </Row>

        {/* Tablas de Resumen */}
        <Row className="g-3">
          {/* Top Clientes */}
          <Col xs={12} lg={6}>
            <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                  <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#5a8f7b' }} />
                  Top 5 Clientas (Citas Atendidas)
                </h5>
                <Badge bg="success" style={{ fontSize: '11px', fontWeight: 600 }}>Completadas</Badge>
              </div>
              {topClients.length === 0 ? (
                <Alert variant="info" style={{ fontSize: '12px', marginBottom: 0 }}>
                  No hay clientas con citas completadas en este período
                </Alert>
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
          </Col>

          {/* Clientes que Cancelan */}
          <Col xs={12} lg={6}>
            <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h5 style={{ color: TEXT_DARK, fontWeight: 700, margin: 0, fontSize: '15px' }}>
                  <AlertCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#dc3545' }} />
                  Clientas con Mayor Cancelación
                </h5>
                <Badge bg="danger" style={{ fontSize: '11px', fontWeight: 600 }}>Canceladas</Badge>
              </div>
              {cancelledClients.length === 0 ? (
                <Alert variant="info" style={{ marginBottom: 0, fontSize: '12px' }}>
                  No hay cancelaciones en este período
                </Alert>
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
          </Col>
        </Row>

        {/* Motivos de Cancelación */}
        <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(180, 120, 100, 0.05)' }}>
          <h5 style={{ color: TEXT_DARK, fontWeight: 700, marginBottom: '14px', fontSize: '15px' }}>
            Motivos de Cancelación Frecuentes
          </h5>
          {cancellationReasons.length === 0 ? (
            <Alert variant="info" style={{ marginBottom: 0, fontSize: '12px' }}>
              No se registran motivos de cancelación en este período
            </Alert>
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
              variant="outline-secondary"
              size="sm"
              style={{ borderRadius: '8px', borderColor: '#d4a89a', color: TEXT_DARK }}
              onClick={() => {
                exportToCSV({
                  filename: `reporte-cancelaciones-${startDate}-${endDate}`,
                  headers: ['Cliente', 'Teléfono', 'Servicio', 'Fecha', 'Monto', 'Motivo'],
                  data: cancelledDetail.map((item) => ({
                    'Cliente': item.customerName,
                    'Teléfono': item.customerPhone,
                    'Servicio': item.serviceName,
                    'Fecha': format(new Date(item.appointmentDate), 'dd/MM/yyyy'),
                    'Monto': `$${item.total.toLocaleString('es-CL')}`,
                    'Motivo': item.cancellationReason,
                  })),
                });
                toast.success('Reporte descargado exitosamente');
              }}
            >
              <Download size={14} style={{ marginRight: '6px' }} />
              Descargar CSV
            </Button>
          </div>

          {cancelledDetail.length === 0 ? (
            <Alert variant="info" style={{ marginBottom: 0, fontSize: '12px' }}>
              No hay cancelaciones registradas en este período
            </Alert>
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
                        {format(new Date(item.appointmentDate), 'dd/MM/yyyy')}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#dc3545', fontWeight: 600 }}>
                        ${item.total.toLocaleString('es-CL')}
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
              variant="outline-secondary"
              size="sm"
              style={{ borderRadius: '8px', borderColor: '#d4a89a', color: TEXT_DARK }}
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
              <Download size={14} style={{ marginRight: '6px' }} />
              Descargar CSV
            </Button>
          </div>

          {clientsMetrics.length === 0 ? (
            <Alert variant="info" style={{ marginBottom: 0, fontSize: '12px' }}>
              No hay registros de clientas en este período
            </Alert>
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
    </DashboardLayout>
  );
}
