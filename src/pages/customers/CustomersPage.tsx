import { useState, useEffect } from 'react';
import { Row, Col, Card, Alert, Table, Button, Form, Badge, Spinner } from 'react-bootstrap';
import DashboardLayout from '../../components/common/DashboardLayout';
import CustomerFormModal from '../../components/customers/CustomerFormModal';
import DeleteCustomerModal from '../../components/customers/DeleteCustomerModal';
import { useCustomersStore } from '../../stores/customersStore';
import { Customer, NotificationPreference } from '../../types/customer.types';

export default function CustomersPage() {
    const [search, setSearch] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    
    const { customers, loading, error, fetchCustomers, deleteCustomer } = useCustomersStore();

    useEffect(() => {
        fetchCustomers();
    }, []);

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
    };

    const handleCloseDeleteModal = () => {
        setShowDeleteModal(false);
        setSelectedCustomer(null);
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

    return (
        <DashboardLayout>
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h1>👥 Gestión de Clientes</h1>
                            <p className="text-muted">Administra la base de datos de clientes</p>
                        </div>
                        <Button variant="primary" size="lg" onClick={handleNewCustomer}>
                            ➕ Nuevo Cliente
                        </Button>
                    </div>
                </Col>
            </Row>

            {/* Búsqueda */}
            <Row className="mb-4">
                <Col md={6}>
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
                                    <Button type="submit" variant="primary">
                                        🔍 Buscar
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
                                <Table responsive hover className="mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>Nombre Completo</th>
                                            <th>Teléfono</th>
                                            <th>Email</th>
                                            <th>Notificaciones</th>
                                            <th className="text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customers.map((customer) => (
                                            <tr key={customer.id}>
                                                <td>
                                                    <code className="text-muted small">
                                                        #{customer.publicId}
                                                    </code>
                                                </td>
                                                <td className="fw-semibold">{customer.fullName}</td>
                                                <td>
                                                    <a href={`tel:${customer.phone}`} className="text-decoration-none">
                                                        📱 {customer.phone}
                                                    </a>
                                                </td>
                                                <td>
                                                    {customer.email ? (
                                                        <a href={`mailto:${customer.email}`} className="text-decoration-none">
                                                            {customer.email}
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted">-</span>
                                                    )}
                                                </td>
                                                <td>{getNotificationBadge(customer.notificationPreference)}</td>
                                                <td className="text-center">
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
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Modales */}
            <CustomerFormModal
                show={showFormModal}
                onHide={handleCloseFormModal}
                customer={selectedCustomer}
            />

            <DeleteCustomerModal
                show={showDeleteModal}
                onHide={handleCloseDeleteModal}
                customer={selectedCustomer}
                onConfirm={confirmDelete}
                loading={loading}
            />
        </DashboardLayout>
    );
}
