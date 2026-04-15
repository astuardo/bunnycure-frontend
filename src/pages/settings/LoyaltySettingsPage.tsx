import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, ListGroup, Spinner } from 'react-bootstrap';
import { Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useLoyaltyStore } from '../../stores/loyaltyStore';

export default function LoyaltySettingsPage() {
  const { rewards, loading, fetchRewards, createReward, updateReward, deleteReward } = useLoyaltyStore();
  const [newRewardName, setNewRewardName] = useState('');

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRewardName.trim()) return;
    await createReward(newRewardName);
    setNewRewardName('');
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este premio de la lista?')) {
      await deleteReward(id);
    }
  };

  return (
    <DashboardLayout>
      <Container fluid className="bunny-page">
        <Row className="mb-4">
          <Col>
            <h2>⚙️ Configuración de Fidelización</h2>
            <p className="text-muted">Gestiona el ciclo de premios para tus clientas.</p>
          </Col>
        </Row>

        <Row>
          <Col md={8}>
            <Card className="shadow-sm border-0 mb-4">
              <Card.Header className="bg-white py-3">
                <h5 className="mb-0">Lista de Premios en Ciclo</h5>
                <small className="text-muted">Las clientas ganarán estos premios en orden cada vez que completen 10 visitas.</small>
              </Card.Header>
              <Card.Body>
                {loading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" variant="primary" />
                  </div>
                ) : (
                  <ListGroup variant="flush">
                    {rewards.map((reward, index) => (
                      <ListGroup.Item key={reward.id} className="d-flex align-items-center gap-3 py-3 border-light">
                        <div className="text-primary fw-bold" style={{ width: '30px' }}>
                          {index + 1}.
                        </div>
                        <Form.Control
                          type="text"
                          defaultValue={reward.name}
                          onBlur={(e) => {
                            if (e.target.value !== reward.name) {
                              updateReward(reward.id, e.target.value);
                            }
                          }}
                          className="border-0 bg-light"
                        />
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handleDelete(reward.id)}
                          className="border-0"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </ListGroup.Item>
                    ))}
                    
                    <ListGroup.Item className="py-4 border-0">
                      <Form onSubmit={handleAddReward} className="d-flex gap-2">
                        <Form.Control
                          type="text"
                          placeholder="Nuevo premio (ej: 20% Descuento)"
                          value={newRewardName}
                          onChange={(e) => setNewRewardName(e.target.value)}
                        />
                        <Button type="submit" variant="primary" className="d-flex align-items-center gap-2">
                          <Plus size={18} /> Agregar
                        </Button>
                      </Form>
                    </ListGroup.Item>
                  </ListGroup>
                )}
              </Card.Body>
              <Card.Footer className="bg-light p-3">
                <small className="text-muted">
                  <strong>¿Cómo funciona?</strong> Cuando una clienta llega a 10 sellos, su visita #11 no suma sellos y se le otorga el premio actual. Luego el contador vuelve a 0 y pasa al siguiente premio de esta lista. Al terminar la lista, vuelve al primero.
                </small>
              </Card.Footer>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="bg-primary text-white border-0 shadow-sm mb-4">
              <Card.Body>
                <h5>💡 Consejos</h5>
                <ul className="mb-0 ps-3">
                  <li className="mb-2">Empieza con premios pequeños y haz el 3ro o 5to más especial.</li>
                  <li className="mb-2">Los cambios se aplican de inmediato para todas las clientas.</li>
                  <li>Puedes editar los nombres haciendo clic directamente sobre ellos.</li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </DashboardLayout>
  );
}
