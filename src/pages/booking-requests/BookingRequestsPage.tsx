import { Row, Col, Card, Alert } from 'react-bootstrap';
import DashboardLayout from '../../components/common/DashboardLayout';

export default function BookingRequestsPage() {
    return (
        <DashboardLayout>
            <Row className="mb-4">
                <Col>
                    <h1>📬 Solicitudes de Reserva</h1>
                    <p className="text-muted">Gestiona las reservas enviadas desde el portal público</p>
                </Col>
            </Row>

            <Row>
                <Col>
                    <Alert variant="info">
                        <Alert.Heading>🚧 En Construcción</Alert.Heading>
                        <p className="mb-0">
                            El módulo de solicitudes de reserva estará disponible próximamente.
                            Podrás revisar, aprobar o rechazar las reservas enviadas por clientes.
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
                                <li>Listar solicitudes pendientes</li>
                                <li>Ver detalles de cada solicitud</li>
                                <li>Aprobar solicitud → crear cita</li>
                                <li>Rechazar con motivo</li>
                                <li>Filtrar por estado (pendiente/aprobada/rechazada)</li>
                                <li>Notificar al cliente por email/SMS</li>
                                <li>Historial de solicitudes</li>
                            </ul>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </DashboardLayout>
    );
}
