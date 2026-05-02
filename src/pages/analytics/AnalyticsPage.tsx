/**
 * Página de Analíticas - Dashboard con métricas de negocio
 */

import { useEffect, useState } from 'react';
import { Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
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
import { BarChart3, Users, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/components/common/DashboardLayout';
import { analyticsApi } from '@/api/analytics.api';
import { AnalyticsData } from '@/types/analytics.types';
import { useToast } from '@/hooks/useToast';
import { format, subDays } from 'date-fns';

const formatCurrency = (value: number) => `$${value.toLocaleString('es-CL')}`;

export default function AnalyticsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const result = await analyticsApi.getAnalytics(startDate, endDate);
      setData(result);
    } catch (error) {
      toast.error('Error al cargar analíticas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (!data) {
    return (
      <DashboardLayout>
        <div style={{ padding: '20px', minHeight: '100vh', background: '#fdf0ec' }}>
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Cargando...</span>
            </Spinner>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { metrics, appointmentsByDay, topServices, topClients, cancelledClients, cancellationReasons } = data;

  const PAGE_BG = '#fdf0ec';
  const TEXT_DARK = '#5c3d2e';
  const TEXT_MID = '#9e7b6e';

  const MetricCard = ({ label, value, icon: Icon, color }: any) => (
    <div
      style={{
        background: 'rgba(255,255,255,0.88)',
        borderRadius: '20px',
        padding: '20px',
        textAlign: 'center',
        border: `1px solid ${color}30`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
        <Icon size={28} style={{ color }} />
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: TEXT_DARK, marginBottom: '6px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: TEXT_MID, textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div style={{ minHeight: '100vh', background: PAGE_BG, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Encabezado */}
        <div
          style={{
            background: 'rgba(255,255,255,0.88)',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChart3 size={28} style={{ color: '#c9897a' }} />
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: TEXT_DARK }}>Analíticas de Negocio</h1>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Form.Control
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '140px', fontSize: '13px' }}
            />
            <span style={{ color: TEXT_MID }}>a</span>
            <Form.Control
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '140px', fontSize: '13px' }}
            />
            <Button variant="primary" onClick={loadAnalytics} disabled={loading} size="sm">
              {loading ? 'Cargando...' : 'Actualizar'}
            </Button>
          </div>
        </div>

        {/* Tarjetas de Métricas */}
        <Row style={{ gap: '12px' }} className="g-3">
          <Col xs={12} sm={6} md={4}>
            <MetricCard
              label="Total de Citas"
              value={metrics.totalAppointments}
              icon={BarChart3}
              color="#5a8f7b"
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <MetricCard label="Tasa Cancelación" value={`${metrics.cancelledRate}%`} icon={AlertCircle} color="#dc3545" />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <MetricCard
              label="Ingresos Totales"
              value={formatCurrency(metrics.totalRevenue)}
              icon={BarChart3}
              color="#5a8f7b"
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <MetricCard label="Completadas" value={metrics.totalCompleted} icon={BarChart3} color="#28a745" />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <MetricCard label="Confirmadas" value={metrics.totalConfirmed} icon={BarChart3} color="#ffc107" />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <MetricCard label="Pendientes" value={metrics.totalPending} icon={BarChart3} color="#17a2b8" />
          </Col>
        </Row>

        {/* Gráficos */}
        <Row className="g-3">
          {/* Citas por Día */}
          <Col xs={12} lg={6}>
            <div style={{ background: 'rgba(255,255,255,0.88)', borderRadius: '20px', padding: '20px' }}>
              <h5 style={{ color: TEXT_DARK, fontWeight: 700, marginBottom: '16px' }}>Citas por Día</h5>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={appointmentsByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0e0d8" />
                  <XAxis dataKey="date" stroke={TEXT_MID} />
                  <YAxis stroke={TEXT_MID} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff8f5', borderColor: '#d4a89a' }} />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#5a8f7b" name="Total" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="#28a745" name="Completadas" strokeWidth={2} />
                  <Line type="monotone" dataKey="cancelled" stroke="#dc3545" name="Canceladas" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Col>

          {/* Estado de Citas */}
          <Col xs={12} lg={6}>
            <div style={{ background: 'rgba(255,255,255,0.88)', borderRadius: '20px', padding: '20px' }}>
              <h5 style={{ color: TEXT_DARK, fontWeight: 700, marginBottom: '16px' }}>Distribución de Estados</h5>
              <ResponsiveContainer width="100%" height={300}>
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
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {['#28a745', '#ffc107', '#17a2b8', '#dc3545'].map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Col>

          {/* Top Servicios */}
          <Col xs={12} lg={6}>
            <div style={{ background: 'rgba(255,255,255,0.88)', borderRadius: '20px', padding: '20px' }}>
              <h5 style={{ color: TEXT_DARK, fontWeight: 700, marginBottom: '16px' }}>Top 5 Servicios</h5>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topServices}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0e0d8" />
                  <XAxis dataKey="serviceName" stroke={TEXT_MID} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke={TEXT_MID} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff8f5', borderColor: '#d4a89a' }} />
                  <Bar dataKey="appointmentCount" fill="#5a8f7b" name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Col>

          {/* Ingresos por Servicio */}
          <Col xs={12} lg={6}>
            <div style={{ background: 'rgba(255,255,255,0.88)', borderRadius: '20px', padding: '20px' }}>
              <h5 style={{ color: TEXT_DARK, fontWeight: 700, marginBottom: '16px' }}>Ingresos por Servicio</h5>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topServices}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0e0d8" />
                  <XAxis dataKey="serviceName" stroke={TEXT_MID} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke={TEXT_MID} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff8f5', borderColor: '#d4a89a' }}
                    formatter={(value: any) => formatCurrency(value as number)}
                  />
                  <Bar dataKey="totalRevenue" fill="#c9897a" name="Ingresos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Col>
        </Row>

        {/* Tablas */}
        <Row className="g-3">
          {/* Top Clientes */}
          <Col xs={12} lg={6}>
            <div style={{ background: 'rgba(255,255,255,0.88)', borderRadius: '20px', padding: '20px' }}>
              <h5 style={{ color: TEXT_DARK, fontWeight: 700, marginBottom: '16px' }}>
                <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Top 5 Clientes
              </h5>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f0e0d8' }}>
                      <th style={{ textAlign: 'left', padding: '8px', fontWeight: 700, color: TEXT_DARK }}>
                        Cliente
                      </th>
                      <th style={{ textAlign: 'center', padding: '8px', fontWeight: 700, color: TEXT_DARK }}>
                        Citas
                      </th>
                      <th style={{ textAlign: 'right', padding: '8px', fontWeight: 700, color: TEXT_DARK }}>
                        Gasto
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClients.map((client) => (
                      <tr key={client.clientId} style={{ borderBottom: '1px solid #f0e0d8' }}>
                        <td style={{ padding: '8px', color: TEXT_DARK }}>
                          <div style={{ fontWeight: 500 }}>{client.clientName}</div>
                          <small style={{ color: TEXT_MID }}>{client.clientPhone}</small>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', color: TEXT_DARK }}>
                          {client.appointmentCount}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#5a8f7b', fontWeight: 600 }}>
                          {formatCurrency(client.totalSpent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Col>

          {/* Clientes que Cancelan */}
          <Col xs={12} lg={6}>
            <div style={{ background: 'rgba(255,255,255,0.88)', borderRadius: '20px', padding: '20px' }}>
              <h5 style={{ color: TEXT_DARK, fontWeight: 700, marginBottom: '16px' }}>
                <AlertCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#dc3545' }} />
                Clientes que Cancelan Más
              </h5>
              {cancelledClients.length === 0 ? (
                <Alert variant="info" style={{ marginBottom: 0, fontSize: '12px' }}>
                  No hay cancelaciones en este período
                </Alert>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f0e0d8' }}>
                        <th style={{ textAlign: 'left', padding: '8px', fontWeight: 700, color: TEXT_DARK }}>
                          Cliente
                        </th>
                        <th style={{ textAlign: 'center', padding: '8px', fontWeight: 700, color: TEXT_DARK }}>
                          Canceladas
                        </th>
                        <th style={{ textAlign: 'center', padding: '8px', fontWeight: 700, color: TEXT_DARK }}>
                          Tasa
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cancelledClients.map((client) => (
                        <tr key={client.clientId} style={{ borderBottom: '1px solid #f0e0d8' }}>
                          <td style={{ padding: '8px', color: TEXT_DARK }}>
                            <div style={{ fontWeight: 500 }}>{client.clientName}</div>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#dc3545', fontWeight: 600 }}>
                            {client.cancelledCount}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', color: TEXT_MID }}>
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
        <div style={{ background: 'rgba(255,255,255,0.88)', borderRadius: '20px', padding: '20px' }}>
          <h5 style={{ color: TEXT_DARK, fontWeight: 700, marginBottom: '16px' }}>Motivos de Cancelación</h5>
          {cancellationReasons.length === 0 ? (
            <Alert variant="info" style={{ marginBottom: 0, fontSize: '12px' }}>
              No hay cancelaciones en este período
            </Alert>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0e0d8' }}>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: 700, color: TEXT_DARK }}>
                      Motivo
                    </th>
                    <th style={{ textAlign: 'center', padding: '12px', fontWeight: 700, color: TEXT_DARK }}>
                      Cantidad
                    </th>
                    <th style={{ textAlign: 'right', padding: '12px', fontWeight: 700, color: TEXT_DARK }}>
                      Porcentaje
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cancellationReasons.slice(0, 10).map((reason, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0e0d8' }}>
                      <td style={{ padding: '12px', color: TEXT_DARK }}>{reason.reason}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#dc3545', fontWeight: 600 }}>
                        {reason.count}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: TEXT_MID, fontWeight: 600 }}>
                        {reason.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
