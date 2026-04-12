import { useState, useEffect } from 'react';
import { Row, Col, Card, Alert, Table, Button, Form, Badge, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/common/DashboardLayout';
import CustomerFormModal from '../../components/customers/CustomerFormModal';
import DeleteCustomerModal from '../../components/customers/DeleteCustomerModal';
import { useCustomersStore } from '../../stores/customersStore';
import { useAuthStore } from '../../stores/authStore';
import { Customer, NotificationPreference } from '../../types/customer.types';

export default function CustomersPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    
    const { customers, loading, error, fetchCustomers, deleteCustomer } = useCustomersStore();
    const { isAuthenticated, user } = useAuthStore();
    const isQuickCreateMode = searchParams.get('create') === '1';

    useEffect(() => {
        // Solo fetch si está autenticado y tiene usuario
        if (isAuthenticated && user) {
            console.log('✅ Usuario autenticado, cargando clientes...');
            fetchCustomers();
        } else {
            console.warn('⚠️ Usuario no autenticado en CustomersPage');
        }
    }, [isAuthenticated, user, fetchCustomers]);

    const showCustomerFormModal = showFormModal || isQuickCreateMode;

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

    const getNotificationBadge = (pref: NotificationPreference) => {
        switch (pref) {
            case NotificationPreference.EMAIL:
                return <Badge bg="info">📧 Email</Badge>;
            case NotificationPreference.WHATSAPP:
                return <Badge bg="success">💬 WhatsApp</Badge>;
            case NotificationPreference.BOTH:
                return <Badge bg="primary">📧💬 Ambos</Badge>;
            case NotificationPreference.NONE:
                return <Badge bg="secondary">🔕 Ninguno</Badge>;
            default:
                return <Badge bg="secondary">-</Badge>;
        }
    };

    const formatHealthNotes = (notes?: string) => {
        if (!notes || !notes.trim()) return <span className="text-muted">Sin notas</span>;
        return notes.length > 60 ? `${notes.slice(0, 60)}...` : notes;
    };

    return (
        <DashboardLayout>
            <div className="bunny-page">
            <Row className="mb-3 mb-md-4">
                <Col>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                        <div>
                            <h1 className="mb-1">👥 Gestión de Clientes</h1>
                            <p className="text-muted mb-0 small">Administra la base de datos de clientes</p>
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

            {/* Búsqueda */}
            <Row className="mb-3 mb-md-4">
                <Col md={8} lg={6}>
                    <Card>
                        <Card.Body>
                            <Form onSubmit={handleSearch}>
                                <Form.Group className="d-flex gap-2">
                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar por nombre o teléfono..."
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
                                        <Table responsive hover className="mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Nombre</th>
                                                    <th>Teléfono</th>
                                                    <th>Notificaciones</th>
                                                    <th>Notas de Salud</th>
                                                    <th className="text-center">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {customers.map((customer) => (
                                                    <tr key={customer.id}>
                                                        <td className="fw-semibold">{customer.fullName}</td>
                                                        <td>
                                                            <a href={`tel:${customer.phone}`} className="text-decoration-none">
                                                                📱 {customer.phone}
                                                            </a>
                                                        </td>
                                                        <td>{getNotificationBadge(customer.notificationPreference)}</td>
                                                        <td>{formatHealthNotes(customer.healthNotes)}</td>
                                                        <td className="text-center">
                                                            <Button 
                                                                variant="outline-primary" 
                                                                size="sm"
                                                                className="me-2"
                                                                onClick={() => navigate(`/customers/${customer.id}`)}
                                                            >
                                                                👁️ Ver
                                                            </Button>
                                                            <Button 
                                                                variant="outline-secondary" 
                                                                size="sm"
                                                                className="me-2"
                                                                onClick={() => handleEditCustomer(customer)}
                                                            >
                                                                ✏️ Editar
                                                            </Button>
                                                            <Button 
                                                                variant="outline-danger" 
                                                                size="sm"
                                                                onClick={() => handleDeleteCustomer(customer)}
                                                            >
                                                                🗑️
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>

                                    {/* Vista Móvil: Cards */}
                                    <div className="d-md-none">
                                        {customers.map((customer) => (
                                            <Card key={customer.id} className="mb-3 mx-3 mt-3">
                                                <Card.Body>
                                                    <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                                                        <div style={{ minWidth: 0 }}>
                                                            <h6 className="mb-1 fw-bold text-break">{customer.fullName}</h6>
                                                            <small className="text-muted d-block text-break">📱 {customer.phone}</small>
                                                        </div>
                                                        <div className="flex-shrink-0">
                                                            {getNotificationBadge(customer.notificationPreference)}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="mb-2">
                                                        <small className="text-muted d-block">Notas de Salud:</small>
                                                        <small className="text-break">{formatHealthNotes(customer.healthNotes)}</small>
                                                    </div>
                                                     
                                                    <div className="d-flex gap-2 flex-wrap">
                                                        <Button 
                                                            variant="outline-primary" 
                                                            size="sm"
                                                            className="flex-fill"
                                                            onClick={() => navigate(`/customers/${customer.id}`)}
                                                        >
                                                            👁️ Ver
                                                        </Button>
                                                        <Button 
                                                            variant="outline-secondary" 
                                                            size="sm"
                                                            className="flex-fill"
                                                            onClick={() => handleEditCustomer(customer)}
                                                        >
                                                            ✏️ Editar
                                                        </Button>
                                                        <Button 
                                                            variant="outline-danger" 
                                                            size="sm"
                                                            onClick={() => handleDeleteCustomer(customer)}
                                                        >
                                                            🗑️
                                                        </Button>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        ))}
                                    </div>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

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
