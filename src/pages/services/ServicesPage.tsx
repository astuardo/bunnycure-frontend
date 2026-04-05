import { Row, Col, Card, Alert } from 'react-bootstrap';
import DashboardLayout from '../../components/common/DashboardLayout';

export default function ServicesPage() {
    return (
        <DashboardLayout>
            <Row className="mb-4">
                <Col>
                    <h1>💅 Gestión de Servicios</h1>
                    <p className="text-muted">Administra el catálogo de servicios ofrecidos</p>
                </Col>
            </Row>

            <Row>
                <Col>
                    <Alert variant="info">
                        <Alert.Heading>🚧 En Construcción</Alert.Heading>
                        <p className="mb-0">
                            El módulo de gestión de servicios estará disponible próximamente.
                            Podrás ver, crear y editar todos los servicios del salón.
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
                                <li>Listar todos los servicios</li>
                                <li>Crear nuevo servicio (nombre, duración, precio)</li>
                                <li>Editar servicio existente</li>
                                <li>Activar/desactivar servicios</li>
                                <li>Categorizar servicios</li>
                                <li>Agregar descripción y notas</li>
                                <li>Control de disponibilidad</li>
                            </ul>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </DashboardLayout>
    );
}
