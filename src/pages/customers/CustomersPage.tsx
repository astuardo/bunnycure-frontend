import { Row, Col, Card, Alert } from 'react-bootstrap';
import DashboardLayout from '../../components/common/DashboardLayout';

export default function CustomersPage() {
    return (
        <DashboardLayout>
            <Row className="mb-4">
                <Col>
                    <h1>👥 Gestión de Clientes</h1>
                    <p className="text-muted">Administra la base de datos de clientes</p>
                </Col>
            </Row>

            <Row>
                <Col>
                    <Alert variant="info">
                        <Alert.Heading>🚧 En Construcción</Alert.Heading>
                        <p className="mb-0">
                            El módulo de gestión de clientes estará disponible próximamente.
                            Podrás registrar, ver y editar información de todos los clientes.
                        </p>
                    </Alert>
                </Col>
            </Row>

            <Row>
                <Col>
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Funcionalidades Planificadas</h5>
                        </Card.Header>
                        <Card.Body>
                            <ul>
                                <li>Listar todos los clientes</li>
                                <li>Registrar nuevo cliente (nombre, teléfono, email, notas)</li>
                                <li>Editar información del cliente</li>
                                <li>Ver historial de citas del cliente</li>
                                <li>Buscar cliente por nombre o teléfono</li>
                                <li>Preferencias y notas especiales</li>
                                <li>Estado: Activo/Inactivo</li>
                            </ul>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </DashboardLayout>
    );
}
