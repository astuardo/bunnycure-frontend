import { Container, Row, Col, Card } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <Container fluid className="py-4">
            <Row className="mb-4">
                <Col>
                    <h1>📊 Dashboard</h1>
                    <p className="text-muted">
                        Bienvenido/a, <strong>{user?.fullName || user?.username}</strong>
                    </p>
                </Col>
            </Row>

            <Row>
                <Col xs={12} md={6} lg={3} className="mb-4">
                    <Card className="shadow-sm">
                        <Card.Body>
                            <Card.Title className="text-muted">Citas de Hoy</Card.Title>
                            <h2 className="mb-0">0</h2>
                            <small className="text-muted">No hay citas programadas</small>
                        </Card.Body>
                    </Card>
                </Col>

                <Col xs={12} md={6} lg={3} className="mb-4">
                    <Card className="shadow-sm">
                        <Card.Body>
                            <Card.Title className="text-muted">Pendientes</Card.Title>
                            <h2 className="mb-0">0</h2>
                            <small className="text-muted">Citas por confirmar</small>
                        </Card.Body>
                    </Card>
                </Col>

                <Col xs={12} md={6} lg={3} className="mb-4">
                    <Card className="shadow-sm">
                        <Card.Body>
                            <Card.Title className="text-muted">Solicitudes</Card.Title>
                            <h2 className="mb-0">0</h2>
                            <small className="text-muted">Reservas nuevas</small>
                        </Card.Body>
                    </Card>
                </Col>

                <Col xs={12} md={6} lg={3} className="mb-4">
                    <Card className="shadow-sm">
                        <Card.Body>
                            <Card.Title className="text-muted">Clientes</Card.Title>
                            <h2 className="mb-0">0</h2>
                            <small className="text-muted">Total registrados</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                <Col>
                    <Card className="shadow-sm">
                        <Card.Header>
                            <h5 className="mb-0">🚀 Próximas Implementaciones</h5>
                        </Card.Header>
                        <Card.Body>
                            <ul>
                                <li>✅ Sistema de autenticación (completado)</li>
                                <li>⏳ CRUD de Citas (agenda)</li>
                                <li>⏳ CRUD de Clientes</li>
                                <li>⏳ Gestión de Servicios</li>
                                <li>⏳ Solicitudes de Reserva</li>
                            </ul>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}