import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Alert, Table, Button, Form, Badge, Spinner, Nav } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/common/DashboardLayout';
import CustomerFormModal from '../../components/customers/CustomerFormModal';
import DeleteCustomerModal from '../../components/customers/DeleteCustomerModal';
import CustomerReactivationTab from '../../components/customers/CustomerReactivationTab';
import CustomerBirthdaysTab from '../../components/customers/CustomerBirthdaysTab';
import { useCustomersStore } from '../../stores/customersStore';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { useServicesStore } from '../../stores/servicesStore';
import { useAuthStore } from '../../stores/authStore';
import { Customer, NotificationPreference } from '../../types/customer.types';
import { computeInactiveCustomers } from '../../utils/reactivationUtils';
import { computeBirthdayCustomers } from '../../utils/birthdayUtils';
import { formatRutWithDots } from '../../utils/rutUtils';

export default function CustomersPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') as 'directory' | 'reactivation' | 'birthdays') || 'directory';
    const [activeTab, setActiveTab] = useState<'directory' | 'reactivation' | 'birthdays'>(initialTab);
    const [search, setSearch] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    
    const { customers, loading, error, fetchCustomers, deleteCustomer } = useCustomersStore();
    const { appointments, isLoading: appointmentsLoading, fetchAppointments } = useAppointmentsStore();
    const { services, isLoading: servicesLoading, fetchServices } = useServicesStore();
    const { isAuthenticated, user } = useAuthStore();
    const isQuickCreateMode = searchParams.get('create') === '1';

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'birthdays' || tabParam === 'reactivation' || tabParam === 'directory') {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    useEffect(() => {
        // Solo fetch si está autenticado y tiene usuario
        if (isAuthenticated && user) {
            console.log('✅ Usuario autenticado, cargando clientes, citas y servicios...');
            fetchCustomers();
            fetchAppointments();
            fetchServices();
        } else {
            console.warn('⚠️ Usuario no autenticado en CustomersPage');
        }
    }, [isAuthenticated, user, fetchCustomers, fetchAppointments, fetchServices]);

    const showCustomerFormModal = showFormModal || isQuickCreateMode;

    // Calcular cantidad de clientas inactivas para la insignia del tab
    const inactiveCustomersCount = useMemo(() => {
        return computeInactiveCustomers(customers, appointments).length;
    }, [customers, appointments]);

    // Calcular cumpleañeras del mes para la insignia del tab
    const { metrics: birthdayMetrics } = useMemo(() => {
        return computeBirthdayCustomers(customers);
    }, [customers]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchCustomers(search.trim() || undefined);
    };

    const handleClearSearch = () => {
        setSearch('');
        fetchCustomers();
    };

    const handleNewCustomer = () => {
        setSelectedCustomer(null);
        setShowFormModal(true);
    };

    const handleEditCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setShowFormModal(true);
    };

    const handleDeleteCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedCustomer) return;
        
        const success = await deleteCustomer(selectedCustomer.id);
        if (success) {
            setShowDeleteModal(false);
            setSelectedCustomer(null);
        }
    };

    const handleCloseFormModal = () => {
        setShowFormModal(false);
        setSelectedCustomer(null);
        if (isQuickCreateMode) {
            setSearchParams({}, { replace: true });
        }
    };

    const handleCloseDeleteModal = () => {
        setShowDeleteModal(false);
        setSelectedCustomer(null);
    };

    const handleCustomerFormSuccess = () => {
        const returnTo = searchParams.get('returnTo');
        if (isQuickCreateMode && returnTo) {
            navigate(returnTo, { replace: true });
        }
    };

    const isBirthdayThisMonth = (birthDate?: string) => {
        if (!birthDate) return false;
        try {
            const currentMonth = new Date().getMonth() + 1;
            const parts = birthDate.split('-');
            if (parts.length >= 2) {
                return parseInt(parts[1], 10) === currentMonth;
            }
        } catch {
            return false;
        }
        return false;
    };

    const getNotificationBadge = (pref?: NotificationPreference | string) => {
        if (!pref || pref === NotificationPreference.BOTH || pref === 'BOTH') {
            return <Badge bg="primary" style={{ fontSize: '11px' }}>📧💬 WhatsApp + Email</Badge>;
        }
        if (pref === NotificationPreference.WHATSAPP || pref === 'WHATSAPP') {
            return <Badge bg="success" style={{ fontSize: '11px' }}>💬 Solo WhatsApp</Badge>;
        }
        if (pref === NotificationPreference.EMAIL || pref === 'EMAIL') {
            return <Badge bg="info" style={{ fontSize: '11px' }}>📧 Solo Email</Badge>;
        }
        if (pref === NotificationPreference.NONE || pref === 'NONE') {
            return <Badge bg="secondary" style={{ fontSize: '11px' }}>🔕 Sin avisos</Badge>;
        }
        return <Badge bg="success" style={{ fontSize: '11px' }}>💬 WhatsApp</Badge>;
    };

    const formatHealthNotes = (notes?: string) => {
        if (!notes || !notes.trim()) return <span className="text-muted small">Sin observaciones</span>;
        const isAlert = /alerg|diabet|hong|medic|sensib|dolor/i.test(notes);
        return (
            <div>
                {isAlert && <Badge bg="danger" className="mb-1 d-inline-block" style={{ fontSize: '10px' }}>⚠️ Alerta de Salud</Badge>}
                <div className="small text-muted" style={{ lineHeight: 1.3 }}>
                    {notes.length > 70 ? `${notes.slice(0, 70)}...` : notes}
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="bunny-page">
                {/* Header de Página */}
                <Row className="mb-3 mb-md-4">
                    <Col>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                            <div>
                                <h1 className="mb-1">👥 Clientes &amp; Reactivación</h1>
                                <p className="text-muted mb-0 small">
                                    Administra la base de datos de clientas y fideliza a las inactivas
                                </p>
                            </div>
                            <Button 
                                variant="primary" 
                                size="lg" 
                                onClick={handleNewCustomer}
                                className="w-100 w-md-auto"
                            >
                                ➕ Nuevo Cliente
                            </Button>
                        </div>
                    </Col>
                </Row>

                {/* Pestañas de Navegación */}
                <Nav variant="pills" className="mb-3 mb-md-4 gap-2 flex-wrap">
                    <Nav.Item>
                        <Nav.Link
                            active={activeTab === 'directory'}
                            onClick={() => {
                                setActiveTab('directory');
                                setSearchParams({});
                            }}
                            className="d-flex align-items-center gap-2"
                        >
                            <span>👥 Directorio de Clientes</span>
                            <Badge 
                                bg={activeTab === 'directory' ? 'light' : 'secondary'} 
                                text={activeTab === 'directory' ? 'dark' : undefined}
                            >
                                {customers.length}
                            </Badge>
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link
                            active={activeTab === 'birthdays'}
                            onClick={() => {
                                setActiveTab('birthdays');
                                setSearchParams({ tab: 'birthdays' });
                            }}
                            className="d-flex align-items-center gap-2"
                        >
                            <span>🎂 Cumpleañeras del Mes</span>
                            {birthdayMetrics.totalThisMonth > 0 && (
                                <Badge 
                                    bg={activeTab === 'birthdays' ? 'danger' : 'light'} 
                                    text={activeTab === 'birthdays' ? 'white' : 'dark'}
                                    style={activeTab !== 'birthdays' ? { border: '1px solid #eed0c5' } : {}}
                                >
                                    {birthdayMetrics.totalThisMonth} este mes
                                </Badge>
                            )}
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link
                            active={activeTab === 'reactivation'}
                            onClick={() => {
                                setActiveTab('reactivation');
                                setSearchParams({ tab: 'reactivation' });
                            }}
                            className="d-flex align-items-center gap-2"
                        >
                            <span>✨ Reactivación de Clientas</span>
                            {inactiveCustomersCount > 0 && (
                                <Badge 
                                    bg={activeTab === 'reactivation' ? 'danger' : 'warning'} 
                                    text={activeTab === 'reactivation' ? 'white' : 'dark'}
                                >
                                    {inactiveCustomersCount} inactivas
                                </Badge>
                            )}
                        </Nav.Link>
                    </Nav.Item>
                </Nav>

                {/* Vista: Directorio de Clientes */}
                {activeTab === 'directory' && (
                    <>
                        {/* Búsqueda */}
                        <Row className="mb-3 mb-md-4">
                            <Col md={8} lg={6}>
                                <Card>
                                    <Card.Body>
                                        <Form onSubmit={handleSearch}>
                                            <Form.Group className="d-flex gap-2">
                                                <Form.Control
                                                    type="text"
                                                    placeholder="Buscar por nombre, RUT (18.664.589-8 o 18664589-8) o teléfono..."
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                />
                                                <Button type="submit" variant="primary" className="text-nowrap">
                                                    🔍 <span className="d-none d-sm-inline">Buscar</span>
                                                </Button>
                                                {search && (
                                                    <Button 
                                                        type="button" 
                                                        variant="outline-secondary"
                                                        onClick={handleClearSearch}
                                                    >
                                                        ✖️
                                                    </Button>
                                                )}
                                            </Form.Group>
                                        </Form>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {/* Error */}
                        {error && (
                            <Row className="mb-4">
                                <Col>
                                    <Alert variant="danger" dismissible>
                                        {error}
                                    </Alert>
                                </Col>
                            </Row>
                        )}

                        {/* Tabla de Clientes */}
                        <Row>
                            <Col>
                                <Card>
                                    <Card.Header className="d-flex justify-content-between align-items-center">
                                        <h5 className="mb-0">Lista de Clientes</h5>
                                        <Badge bg="secondary">{customers.length} clientes</Badge>
                                    </Card.Header>
                                    <Card.Body className="p-0">
                                        {loading ? (
                                            <div className="text-center py-5">
                                                <Spinner animation="border" role="status">
                                                    <span className="visually-hidden">Cargando...</span>
                                                </Spinner>
                                                <p className="mt-2 text-muted">Cargando clientes...</p>
                                            </div>
                                        ) : customers.length === 0 ? (
                                            <div className="text-center py-5">
                                                <p className="text-muted mb-0">
                                                    {search 
                                                        ? 'No se encontraron clientes con ese criterio'
                                                        : 'No hay clientes registrados'
                                                    }
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Vista Desktop: Tabla */}
                                                <div className="d-none d-md-block">
                                                    <Table responsive hover className="align-middle mb-0">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th style={{ minWidth: '220px' }}>Cliente</th>
                                                                <th>Contacto Directo</th>
                                                                <th>Notificaciones</th>
                                                                <th>Ficha & Salud</th>
                                                                <th className="text-center" style={{ minWidth: '160px' }}>Acciones</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {customers.map((customer) => {
                                                                const rawPhone = (customer.phone || '').replace(/\D/g, '');
                                                                const waPhone = rawPhone.length === 9 ? `56${rawPhone}` : rawPhone;

                                                                return (
                                                                    <tr key={customer.id}>
                                                                        <td>
                                                                            <div className="d-flex flex-column gap-1">
                                                                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                                                                    <span className="fw-bold" style={{ color: '#422314', fontSize: '14.5px' }}>
                                                                                        {customer.fullName}
                                                                                    </span>
                                                                                    {customer.totalCompletedVisits !== undefined && customer.totalCompletedVisits >= 5 && (
                                                                                        <Badge bg="warning" text="dark" style={{ fontSize: '10px' }}>👑 VIP</Badge>
                                                                                    )}
                                                                                    {customer.totalCompletedVisits !== undefined && customer.totalCompletedVisits < 2 && (
                                                                                        <Badge bg="light" text="dark" style={{ fontSize: '10px', border: '1px solid #eed0c5' }}>✨ Nueva</Badge>
                                                                                    )}
                                                                                    {isBirthdayThisMonth(customer.birthDate) && (
                                                                                        <Badge bg="danger" style={{ fontSize: '10px' }}>🎂 Cumpleañera</Badge>
                                                                                    )}
                                                                                </div>
                                                                                <div className="d-flex align-items-center gap-2 flex-wrap small">
                                                                                    {customer.rut ? (
                                                                                        <span className="badge bg-light text-secondary border px-2 py-1 font-monospace" style={{ fontSize: '11px' }}>
                                                                                            🆔 {formatRutWithDots(customer.rut)}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-muted fst-italic" style={{ fontSize: '11px' }}>Sin RUT</span>
                                                                                    )}
                                                                                    <span className="text-muted" style={{ fontSize: '11.5px' }}>
                                                                                        ⭐ <strong>{customer.loyaltyStamps || 0}/10</strong> sellos &bull; {customer.totalCompletedVisits || 0} visitas
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="d-flex flex-column gap-1">
                                                                                <div className="d-flex align-items-center gap-2">
                                                                                    <a href={`tel:${customer.phone}`} className="text-decoration-none small fw-semibold" style={{ color: '#422314' }}>
                                                                                        📱 {customer.phone}
                                                                                    </a>
                                                                                    {rawPhone && (
                                                                                        <a
                                                                                            href={`https://wa.me/${waPhone}`}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="badge bg-success text-white text-decoration-none px-2 py-1"
                                                                                            title="Enviar WhatsApp"
                                                                                            style={{ fontSize: '11px' }}
                                                                                        >
                                                                                            💬 WhatsApp
                                                                                        </a>
                                                                                    )}
                                                                                </div>
                                                                                {customer.email && (
                                                                                    <span className="text-muted small text-truncate" style={{ maxWidth: '200px', fontSize: '11.5px' }}>
                                                                                        ✉️ {customer.email}
                                                                                    </span>
                                                                                )}
                                                                                {customer.instagram && (
                                                                                    <span className="text-primary small" style={{ fontSize: '11.5px' }}>
                                                                                        📸 {customer.instagram.startsWith('@') ? customer.instagram : `@${customer.instagram}`}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td>{getNotificationBadge(customer.notificationPreference)}</td>
                                                                        <td>{formatHealthNotes(customer.healthNotes)}</td>
                                                                        <td className="text-center">
                                                                            <Button 
                                                                                variant="outline-primary" 
                                                                                size="sm" 
                                                                                className="me-1"
                                                                                onClick={() => navigate(`/customers/${customer.id}`)}
                                                                                style={{ borderRadius: '6px' }}
                                                                            >
                                                                                👁️ Ver Ficha
                                                                            </Button>
                                                                            <Button 
                                                                                variant="outline-secondary" 
                                                                                size="sm" 
                                                                                className="me-1"
                                                                                onClick={() => handleEditCustomer(customer)}
                                                                                style={{ borderRadius: '6px' }}
                                                                            >
                                                                                ✏️
                                                                            </Button>
                                                                            <Button 
                                                                                variant="outline-danger" 
                                                                                size="sm" 
                                                                                onClick={() => handleDeleteCustomer(customer)}
                                                                                style={{ borderRadius: '6px' }}
                                                                            >
                                                                                🗑️
                                                                            </Button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </Table>
                                                </div>

                                                {/* Vista Móvil: Cards */}
                                                <div className="d-md-none">
                                                    {customers.map((customer) => {
                                                        const rawPhone = (customer.phone || '').replace(/\D/g, '');
                                                        const waPhone = rawPhone.length === 9 ? `56${rawPhone}` : rawPhone;

                                                        return (
                                                            <Card key={customer.id} className="mb-3 mx-3 mt-3 border-0 shadow-sm" style={{ borderRadius: '12px', background: '#fff' }}>
                                                                <Card.Body className="p-3">
                                                                    <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                                                                        <div style={{ minWidth: 0 }}>
                                                                            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                                                                <h6 className="mb-0 fw-bold text-break" style={{ color: '#422314' }}>{customer.fullName}</h6>
                                                                                {customer.totalCompletedVisits !== undefined && customer.totalCompletedVisits >= 5 && (
                                                                                    <Badge bg="warning" text="dark" style={{ fontSize: '9px' }}>👑 VIP</Badge>
                                                                                )}
                                                                                {isBirthdayThisMonth(customer.birthDate) && (
                                                                                    <Badge bg="danger" style={{ fontSize: '9px' }}>🎂</Badge>
                                                                                )}
                                                                            </div>
                                                                            <div className="d-flex align-items-center gap-2 flex-wrap small">
                                                                                {customer.rut ? (
                                                                                    <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: '10.5px' }}>
                                                                                        🆔 {formatRutWithDots(customer.rut)}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-muted fst-italic" style={{ fontSize: '10.5px' }}>Sin RUT</span>
                                                                                )}
                                                                                <span className="text-muted" style={{ fontSize: '11px' }}>
                                                                                    ⭐ {customer.loyaltyStamps || 0}/10 sellos
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex-shrink-0">
                                                                            {getNotificationBadge(customer.notificationPreference)}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="d-flex align-items-center gap-2 mb-2">
                                                                        <small className="text-muted text-break">📱 {customer.phone}</small>
                                                                        {rawPhone && (
                                                                            <a
                                                                                href={`https://wa.me/${waPhone}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="badge bg-success text-white text-decoration-none px-2 py-1"
                                                                                style={{ fontSize: '10px' }}
                                                                            >
                                                                                💬 WhatsApp
                                                                            </a>
                                                                        )}
                                                                    </div>

                                                                    <div className="mb-3">
                                                                        {formatHealthNotes(customer.healthNotes)}
                                                                    </div>
                                                                    
                                                                    <div className="d-flex gap-2 flex-wrap">
                                                                        <Button 
                                                                            variant="outline-primary" 
                                                                            size="sm" 
                                                                            className="flex-fill"
                                                                            onClick={() => navigate(`/customers/${customer.id}`)}
                                                                            style={{ borderRadius: '8px' }}
                                                                        >
                                                                            👁️ Ver Ficha
                                                                        </Button>
                                                                        <Button 
                                                                            variant="outline-secondary" 
                                                                            size="sm" 
                                                                            className="flex-fill"
                                                                            onClick={() => handleEditCustomer(customer)}
                                                                            style={{ borderRadius: '8px' }}
                                                                        >
                                                                            ✏️ Editar
                                                                        </Button>
                                                                        <Button 
                                                                            variant="outline-danger" 
                                                                            size="sm" 
                                                                            onClick={() => handleDeleteCustomer(customer)}
                                                                            style={{ borderRadius: '8px' }}
                                                                        >
                                                                            🗑️
                                                                        </Button>
                                                                    </div>
                                                                </Card.Body>
                                                            </Card>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </>
                )}

                {/* Vista: Cumpleañeras del Mes */}
                {activeTab === 'birthdays' && (
                    <CustomerBirthdaysTab
                        customers={customers}
                        loading={loading}
                    />
                )}

                {/* Vista: Reactivación de Clientas */}
                {activeTab === 'reactivation' && (
                    <CustomerReactivationTab
                        customers={customers}
                        appointments={appointments}
                        services={services}
                        loading={loading || appointmentsLoading || servicesLoading}
                    />
                )}

                {/* Modales */}
                <CustomerFormModal
                    show={showCustomerFormModal}
                    onHide={handleCloseFormModal}
                    customer={selectedCustomer}
                    onSuccess={handleCustomerFormSuccess}
                />

                <DeleteCustomerModal
                    show={showDeleteModal}
                    onHide={handleCloseDeleteModal}
                    customer={selectedCustomer}
                    onConfirm={confirmDelete}
                    loading={loading}
                />
            </div>
        </DashboardLayout>
    );
}
