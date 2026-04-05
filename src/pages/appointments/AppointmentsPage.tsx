import { Row, Col, Card, Alert } from 'react-bootstrap';
import DashboardLayout from '../../components/common/DashboardLayout';

export default function AppointmentsPage() {
    return (
        <DashboardLayout>
            <Row className="mb-4">
                <Col>
                    <h1>📅 Gestión de Citas</h1>
                    <p className="text-muted">Administra las citas y agenda del salón</p>
                </Col>
            </Row>

            <Row>
                <Col>
                    <Alert variant="info">
                        <Alert.Heading>🚧 En Construcción</Alert.Heading>
                        <p className="mb-0">
                            El módulo de gestión de citas estará disponible próximamente.
                            Podrás ver, crear, editar y gestionar todas las citas del salón.
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
                                <li>Vista de calendario mensual/semanal/diaria</li>
                                <li>Crear nueva cita con cliente y servicio</li>
                                <li>Editar citas existentes</li>
                                <li>Cambiar estado: Programada → Confirmada → Completada</li>
                                <li>Cancelar citas con motivo</li>
                                <li>Buscar y filtrar por fecha/cliente/servicio</li>
                                <li>Notificaciones y recordatorios</li>
                            </ul>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </DashboardLayout>
    );
}
