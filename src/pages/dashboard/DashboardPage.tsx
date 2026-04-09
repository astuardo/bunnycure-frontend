import { useEffect, useState } from 'react';
import { Row, Col, Card, Button, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { isToday, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../hooks/useAuth';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { useBookingRequestsStore } from '../../stores/bookingRequestsStore';
import { useCustomersStore } from '../../stores/customersStore';
import { AppointmentStatus } from '../../types/appointment.types';
import { BookingRequest } from '../../types/booking.types';

export default function DashboardPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { 
        appointments, 
        isLoading: appointmentsLoading, 
        fetchAppointments 
    } = useAppointmentsStore();
    
    const { 
        bookingRequests, 
        fetchBookingRequests 
    } = useBookingRequestsStore();
    
    const { 
        customers, 
        fetchCustomers 
    } = useCustomersStore();

    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setStatsLoading(true);
            await Promise.all([
                fetchAppointments(),
                fetchBookingRequests(),
                fetchCustomers()
            ]);
            setStatsLoading(false);
        };
        loadData();
    }, [fetchAppointments, fetchBookingRequests, fetchCustomers]);

    // Calculate stats
    const todayAppointments = appointments.filter(apt => 
        apt.appointmentDate && isToday(new Date(apt.appointmentDate))
    );

    const thisWeekAppointments = appointments.filter(apt => {
        if (!apt.appointmentDate) return false;
        const date = new Date(apt.appointmentDate);
        const weekStart = startOfWeek(new Date(), { locale: es });
        const weekEnd = endOfWeek(new Date(), { locale: es });
        return date >= weekStart && date <= weekEnd;
    });

    const pendingRequests = bookingRequests.filter((req: BookingRequest) => req.status === 'PENDING');
    const revenueAppointments = appointments.filter((apt) => apt.status !== AppointmentStatus.CANCELLED);
    const totalAppointmentsValue = revenueAppointments.reduce((acc, apt) => acc + (apt.service?.price || 0), 0);

    const serviceStats = revenueAppointments.reduce<Record<number, { name: string; count: number; total: number }>>((acc, apt) => {
        const serviceId = apt.service?.id;
        if (!serviceId) return acc;
        if (!acc[serviceId]) {
            acc[serviceId] = {
                name: apt.service.name,
                count: 0,
                total: 0,
            };
        }
        acc[serviceId].count += 1;
        acc[serviceId].total += apt.service?.price || 0;
        return acc;
    }, {});

    const topServices = Object.values(serviceStats)
        .sort((a, b) => b.count - a.count || b.total - a.total)
        .slice(0, 3);

    const customerStats = revenueAppointments.reduce<Record<number, { name: string; count: number; total: number }>>((acc, apt) => {
        const customerId = apt.customer?.id;
        if (!customerId) return acc;
        if (!acc[customerId]) {
            acc[customerId] = {
                name: apt.customer.fullName,
                count: 0,
                total: 0,
            };
        }
        acc[customerId].count += 1;
        acc[customerId].total += apt.service?.price || 0;
        return acc;
    }, {});

    const topCustomer = Object.values(customerStats)
        .sort((a, b) => b.count - a.count || b.total - a.total)[0];

    const getStatusBadge = (status: AppointmentStatus) => {
        switch (status) {
            case 'PENDING':
                return <Badge bg="warning" text="dark">Pendiente</Badge>;
            case 'CONFIRMED':
                return <Badge bg="info">Confirmada</Badge>;
            case 'COMPLETED':
                return <Badge bg="success">Completada</Badge>;
            case 'CANCELLED':
                return <Badge bg="danger">Cancelada</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    return (
        <DashboardLayout>
            <Row className="mb-4">
                <Col>
                    <h1>📊 Dashboard</h1>
                    <p className="text-muted">
                        Bienvenido/a, <strong>{user?.fullName || user?.username}</strong>
                    </p>
                </Col>
            </Row>

            {/* Stats Cards */}
            <Row>
                <Col xs={12} md={6} lg={3} className="mb-4">
                    <Card className="shadow-sm h-100">
                        <Card.Body>
                            <Card.Title className="text-muted small">Citas de Hoy</Card.Title>
                            {statsLoading ? (
                                <Spinner animation="border" size="sm" />
                            ) : (
                                <>
                                    <h2 className="mb-0 text-primary">{todayAppointments.length}</h2>
                                    <small className="text-muted">
                                        {todayAppointments.length === 0 ? 'No hay citas programadas' : 'citas programadas'}
                                    </small>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                <Col xs={12} md={6} lg={3} className="mb-4">
                    <Card className="shadow-sm h-100">
                        <Card.Body>
                            <Card.Title className="text-muted small">Valor Citas Creadas</Card.Title>
                            {statsLoading ? (
                                <Spinner animation="border" size="sm" />
                            ) : (
                                <>
                                    <h2 className="mb-0 text-warning">${totalAppointmentsValue.toLocaleString('es-CL')}</h2>
                                    <small className="text-muted">{revenueAppointments.length} citas registradas</small>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                <Col xs={12} md={6} lg={3} className="mb-4">
                    <Card className="shadow-sm h-100">
                        <Card.Body>
                            <Card.Title className="text-muted small">Solicitudes Nuevas</Card.Title>
                            {statsLoading ? (
                                <Spinner animation="border" size="sm" />
                            ) : (
                                <>
                                    <h2 className="mb-0 text-danger">{pendingRequests.length}</h2>
                                    <small className="text-muted">
                                        {pendingRequests.length === 0 ? 'Sin solicitudes' : 'Por atender'}
                                    </small>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                <Col xs={12} md={6} lg={3} className="mb-4">
                    <Card className="shadow-sm h-100">
                        <Card.Body>
                            <Card.Title className="text-muted small">Clientes Activos</Card.Title>
                            {statsLoading ? (
                                <Spinner animation="border" size="sm" />
                            ) : (
                                <>
                                    <h2 className="mb-0 text-success">{customers.length}</h2>
                                    <small className="text-muted">Total registrados</small>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Quick Actions */}
            <Row className="mb-4">
                <Col>
                    <Card className="shadow-sm">
                        <Card.Header>
                            <h5 className="mb-0">⚡ Acciones Rápidas</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="d-flex flex-wrap gap-2">
                                <Link to="/appointments">
                                    <Button variant="primary">
                                        📅 Nueva Cita
                                    </Button>
                                </Link>
                                <Link to="/customers">
                                    <Button variant="success">
                                        👤 Nuevo Cliente
                                    </Button>
                                </Link>
                                <Link to="/booking-requests">
                                    <Button variant="warning" className="text-dark">
                                        📬 Ver Solicitudes {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                                    </Button>
                                </Link>
                                <Link to="/services">
                                    <Button variant="info">
                                        💇 Gestionar Servicios
                                    </Button>
                                </Link>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Today's Appointments */}
            <Row className="mb-4">
                <Col>
                    <Card className="shadow-sm">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">📅 Citas de Hoy</h5>
                            <Link to="/appointments">
                                <Button variant="link" size="sm">Ver todas</Button>
                            </Link>
                        </Card.Header>
                        <Card.Body>
                            {appointmentsLoading ? (
                                <div className="text-center py-3">
                                    <Spinner animation="border" />
                                </div>
                            ) : todayAppointments.length === 0 ? (
                                <Alert variant="info" className="mb-0">
                                    No hay citas programadas para hoy.
                                </Alert>
                            ) : (
                                <div className="table-responsive">
                                    <Table hover>
                                        <thead>
                                            <tr>
                                                <th>Hora</th>
                                                <th>Cliente</th>
                                                <th>Servicio</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                            <tbody>
                                                {todayAppointments.slice(0, 5).map((apt) => (
                                                <tr
                                                    key={apt.id}
                                                    role="button"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => navigate('/appointments')}
                                                >
                                                    <td>{apt.appointmentTime || '-'}</td>
                                                    <td>{apt.customer.fullName}</td>
                                                    <td>{apt.service?.name || '-'}</td>
                                                    <td>{getStatusBadge(apt.status)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                    {todayAppointments.length > 5 && (
                                        <div className="text-center">
                                            <Link to="/appointments">
                                                <small>Ver {todayAppointments.length - 5} más...</small>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* This Week Stats */}
            <Row>
                <Col md={6} className="mb-4">
                    <Card className="shadow-sm">
                        <Card.Header>
                            <h5 className="mb-0">📊 Resumen Semanal</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="mb-3">
                                <div className="d-flex justify-content-between">
                                    <span>Citas esta semana:</span>
                                    <strong>{thisWeekAppointments.length}</strong>
                                </div>
                            </div>
                            <div className="mb-3">
                                <div className="d-flex justify-content-between">
                                    <span>Confirmadas:</span>
                                    <strong className="text-info">
                                        {thisWeekAppointments.filter(a => a.status === 'CONFIRMED').length}
                                    </strong>
                                </div>
                            </div>
                            <div className="mb-3">
                                <div className="d-flex justify-content-between">
                                    <span>Completadas:</span>
                                    <strong className="text-success">
                                        {thisWeekAppointments.filter(a => a.status === 'COMPLETED').length}
                                    </strong>
                                </div>
                            </div>
                            <div>
                                <div className="d-flex justify-content-between">
                                    <span>Canceladas:</span>
                                    <strong className="text-danger">
                                        {thisWeekAppointments.filter(a => a.status === 'CANCELLED').length}
                                    </strong>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={6} className="mb-4">
                    <Card className="shadow-sm">
                        <Card.Header>
                            <h5 className="mb-0">💼 Insights de negocio</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="mb-3">
                                <div className="d-flex justify-content-between">
                                    <span>Cliente que más asiste:</span>
                                    <strong>
                                        {topCustomer ? `${topCustomer.name} (${topCustomer.count})` : 'Sin datos'}
                                    </strong>
                                </div>
                            </div>
                            <div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Top servicios:</span>
                                    <strong>Uso / Valor</strong>
                                </div>
                                {topServices.length === 0 ? (
                                    <small className="text-muted">Aún no hay datos de servicios.</small>
                                ) : (
                                    <ul className="list-unstyled mb-0">
                                        {topServices.map((service) => (
                                            <li key={service.name} className="d-flex justify-content-between mb-2">
                                                <span>{service.name}</span>
                                                <strong>
                                                    {service.count} / ${service.total.toLocaleString('es-CL')}
                                                </strong>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </DashboardLayout>
    );
}
