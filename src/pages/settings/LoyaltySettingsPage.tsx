import { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Button, ListGroup, Table, Badge, ProgressBar, Spinner } from 'react-bootstrap';
import { Plus, Trash2, Trophy, Search, ExternalLink, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useLoyaltyStore } from '../../stores/loyaltyStore';
import { useCustomersStore } from '../../stores/customersStore';
import { formatRutWithDots } from '../../utils/rutUtils';

export default function LoyaltySettingsPage() {
  const navigate = useNavigate();
  const { rewards, loading: rewardsLoading, fetchRewards, createReward, updateReward, deleteReward } = useLoyaltyStore();
  const { customers, loading: customersLoading, fetchCustomers } = useCustomersStore();
  const [newRewardName, setNewRewardName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRewards();
    fetchCustomers();
  }, [fetchRewards, fetchCustomers]);

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

  // Ordenar clientas por mayor cantidad de visitas completadas y sellos acumulados
  const rankedCustomers = useMemo(() => {
    const list = [...customers];
    return list.sort((a, b) => {
      const scoreA = (a.totalCompletedVisits || 0) * 10 + (a.loyaltyStamps || 0);
      const scoreB = (b.totalCompletedVisits || 0) * 10 + (b.loyaltyStamps || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.loyaltyStamps || 0) - (a.loyaltyStamps || 0);
    });
  }, [customers]);

  const filteredRankedCustomers = useMemo(() => {
    if (!searchQuery.trim()) return rankedCustomers;
    const q = searchQuery.toLowerCase();
    return rankedCustomers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.rut && c.rut.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [rankedCustomers, searchQuery]);

  return (
    <DashboardLayout>
      <Container fluid className="bunny-page py-4 px-3 px-md-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex align-items-center gap-2">
              <h2 className="mb-0 fw-bold" style={{ color: '#422314', letterSpacing: '-0.5px' }}>
                ⭐ Fidelización &amp; Club de Sellos
              </h2>
            </div>
            <p className="text-muted mb-0 mt-1">
              Configura el ciclo de recompensas y consulta el ranking de clientas con mayor cantidad de sellos y visitas.
            </p>
          </Col>
        </Row>

        {/* Sección Superior: Configuración de Premios y Consejos */}
        <Row className="mb-4">
          <Col lg={7} className="mb-4 mb-lg-0">
            <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '14px', overflow: 'hidden' }}>
              <Card.Header className="bg-white py-3 border-bottom" style={{ borderColor: '#eed0c5' }}>
                <h5 className="mb-0 fw-bold" style={{ color: '#422314' }}>Ciclo de Premios</h5>
                <small className="text-muted">Las clientas ganarán estos premios en orden cada vez que completen 10 visitas.</small>
              </Card.Header>
              <Card.Body>
                {rewardsLoading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" style={{ color: '#c9897a' }} />
                  </div>
                ) : (
                  <ListGroup variant="flush">
                    {rewards.map((reward, index) => (
                      <ListGroup.Item key={reward.id} className="d-flex align-items-center gap-3 py-3 border-light">
                        <div className="fw-bold text-center" style={{ width: '32px', color: '#c9897a', fontSize: '15px' }}>
                          #{index + 1}
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
                          style={{ borderRadius: '8px', fontWeight: 500 }}
                        />
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handleDelete(reward.id)}
                          className="border-0 p-2"
                          style={{ borderRadius: '8px' }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </ListGroup.Item>
                    ))}
                    
                    <ListGroup.Item className="py-3 border-0">
                      <Form onSubmit={handleAddReward} className="d-flex gap-2">
                        <Form.Control
                          type="text"
                          placeholder="Nuevo premio (ej: 20% Descuento en Esmaltado)"
                          value={newRewardName}
                          onChange={(e) => setNewRewardName(e.target.value)}
                          style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
                        />
                        <Button
                          type="submit"
                          className="d-flex align-items-center gap-2 text-nowrap"
                          style={{ background: '#c9897a', borderColor: '#c9897a', borderRadius: '8px', color: '#fff', fontWeight: 600 }}
                        >
                          <Plus size={18} /> Agregar
                        </Button>
                      </Form>
                    </ListGroup.Item>
                  </ListGroup>
                )}
              </Card.Body>
              <Card.Footer className="bg-light p-3 border-0" style={{ fontSize: '12.5px', color: '#6c757d' }}>
                <strong>¿Cómo funciona el ciclo?</strong> Al completar 10 sellos, la visita #11 redime el premio actual. El contador vuelve a 0 y avanza al siguiente premio de la lista en orden continuo.
              </Card.Footer>
            </Card>
          </Col>

          <Col lg={5}>
            <Card className="border-0 shadow-sm text-white mb-3" style={{ borderRadius: '14px', background: 'linear-gradient(135deg, #c9897a 0%, #a86253 100%)' }}>
              <Card.Body className="p-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <Trophy size={22} className="text-warning" />
                  <h5 className="mb-0 fw-bold">Estrategia de Fidelidad</h5>
                </div>
                <p className="small mb-3 opacity-90">
                  Premia la constancia de tus clientas para asegurar visitas recurrentes y aumentar el valor de por vida (LTV).
                </p>
                <ul className="mb-0 ps-3 small opacity-95" style={{ lineHeight: 1.6 }}>
                  <li className="mb-1"><strong>Premio 1:</strong> Descuento accesible o servicio express de regalo.</li>
                  <li className="mb-1"><strong>Premio 3 ó 5:</strong> Spa de manos o diseño nail art premium.</li>
                  <li><strong>Edición en vivo:</strong> Puedes renombrar cualquier premio haciendo clic directamente en su texto.</li>
                </ul>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm" style={{ borderRadius: '14px', background: '#fdf6f3', border: '1px solid #eed0c5' }}>
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="small text-muted d-block">Total Clientas en Programa</span>
                    <h4 className="fw-bold mb-0" style={{ color: '#422314' }}>{customers.length} clientas</h4>
                  </div>
                  <div className="text-end">
                    <span className="small text-muted d-block">Clientas con Sellos Activos</span>
                    <h4 className="fw-bold mb-0" style={{ color: '#5a8f7b' }}>
                      {customers.filter((c) => (c.loyaltyStamps || 0) > 0).length}
                    </h4>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Sección Inferior: Ranking de Clientas con Mayor Cantidad de Sellos por Visita */}
        <Row>
          <Col xs={12}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: '14px', background: '#fff', overflow: 'hidden' }}>
              <Card.Header className="bg-white py-3 border-bottom d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2" style={{ borderColor: '#eed0c5' }}>
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <Trophy size={20} style={{ color: '#c9897a' }} />
                    <h5 className="mb-0 fw-bold" style={{ color: '#422314' }}>
                      Ranking de Clientas Más Fieles (Sellos &amp; Visitas)
                    </h5>
                  </div>
                  <small className="text-muted">
                    Ordenadas por total de visitas completadas y cantidad de sellos acumulados en su ciclo actual.
                  </small>
                </div>

                <div className="input-group input-group-sm" style={{ maxWidth: '300px' }}>
                  <span className="input-group-text bg-light border-end-0" style={{ borderColor: '#eed0c5' }}>
                    <Search size={14} className="text-muted" />
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Buscar clienta por nombre o RUT..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-start-0 bg-light"
                    style={{ borderColor: '#eed0c5' }}
                  />
                </div>
              </Card.Header>

              <Card.Body className="p-0">
                {customersLoading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" style={{ color: '#c9897a' }} />
                    <p className="text-muted small mt-2">Cargando ranking de fidelidad...</p>
                  </div>
                ) : filteredRankedCustomers.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted mb-0">No se encontraron clientas para mostrar en el ranking.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="align-middle mb-0">
                      <thead style={{ background: '#fdf6f3', borderBottom: '1px solid #eed0c5' }}>
                        <tr>
                          <th className="px-3 py-3 text-muted small fw-bold text-center" style={{ width: '70px' }}>LUGAR</th>
                          <th className="py-3 text-muted small fw-bold">CLIENTA</th>
                          <th className="py-3 text-muted small fw-bold">SELLOS DEL CICLO</th>
                          <th className="py-3 text-muted small fw-bold text-center">TOTAL VISITAS</th>
                          <th className="py-3 text-muted small fw-bold text-center">PREMIOS GANADOS</th>
                          <th className="px-3 py-3 text-muted small fw-bold text-end">ACCIONES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRankedCustomers.map((customer, index) => {
                          const stamps = customer.loyaltyStamps || 0;
                          const visits = customer.totalCompletedVisits || 0;
                          const rewardIndex = customer.currentRewardIndex || 0;
                          const percent = Math.min(Math.round((stamps / 10) * 100), 100);
                          const rawPhone = (customer.phone || '').replace(/\D/g, '');
                          const waPhone = rawPhone.length === 9 ? `56${rawPhone}` : rawPhone;

                          // Posición con medallas
                          let rankDisplay: React.ReactNode = `#${index + 1}`;
                          if (index === 0) rankDisplay = <span style={{ fontSize: '20px' }} title="1er Lugar">🥇</span>;
                          else if (index === 1) rankDisplay = <span style={{ fontSize: '20px' }} title="2do Lugar">🥈</span>;
                          else if (index === 2) rankDisplay = <span style={{ fontSize: '20px' }} title="3er Lugar">🥉</span>;

                          return (
                            <tr key={customer.id}>
                              <td className="px-3 text-center fw-bold" style={{ color: '#422314' }}>
                                {rankDisplay}
                              </td>
                              <td>
                                <div className="d-flex flex-column">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="fw-bold" style={{ color: '#422314', fontSize: '14px' }}>
                                      {customer.fullName}
                                    </span>
                                    {visits >= 5 && (
                                      <Badge bg="warning" text="dark" style={{ fontSize: '10px' }}>👑 VIP</Badge>
                                    )}
                                  </div>
                                  <div className="d-flex align-items-center gap-2 small text-muted">
                                    {customer.rut ? (
                                      <span className="font-monospace" style={{ fontSize: '11px' }}>
                                        {formatRutWithDots(customer.rut)}
                                      </span>
                                    ) : (
                                      <span className="fst-italic" style={{ fontSize: '11px' }}>Sin RUT</span>
                                    )}
                                    &bull;
                                    <span style={{ fontSize: '11px' }}>📱 {customer.phone}</span>
                                  </div>
                                </div>
                              </td>
                              <td style={{ minWidth: '200px' }}>
                                <div className="d-flex flex-column gap-1">
                                  <div className="d-flex justify-content-between align-items-center small">
                                    <span className="fw-semibold" style={{ color: '#5a8f7b', fontSize: '12px' }}>
                                      ⭐ {stamps} / 10 sellos
                                    </span>
                                    <span className="text-muted" style={{ fontSize: '11px' }}>
                                      {10 - stamps === 0 ? '¡Listo para canjear!' : `Faltan ${10 - stamps}`}
                                    </span>
                                  </div>
                                  <ProgressBar
                                    now={percent}
                                    style={{ height: '7px', borderRadius: '4px', background: '#f3e9e2' }}
                                    variant={stamps === 10 ? 'success' : 'primary'}
                                  />
                                </div>
                              </td>
                              <td className="text-center">
                                <Badge bg="light" text="dark" className="border px-2 py-1" style={{ fontSize: '12px' }}>
                                  {visits} {visits === 1 ? 'visita' : 'visitas'}
                                </Badge>
                              </td>
                              <td className="text-center">
                                <Badge bg={rewardIndex > 0 ? 'success' : 'secondary'} style={{ fontSize: '11.5px' }}>
                                  🎁 {rewardIndex} {rewardIndex === 1 ? 'premio' : 'premios'}
                                </Badge>
                              </td>
                              <td className="px-3 text-end">
                                <div className="d-inline-flex gap-1">
                                  {rawPhone && (
                                    <a
                                      href={`https://wa.me/${waPhone}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-sm btn-outline-success"
                                      title="Enviar WhatsApp"
                                      style={{ borderRadius: '6px', padding: '4px 8px' }}
                                    >
                                      <MessageCircle size={14} />
                                    </a>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline-primary"
                                    title="Ver Ficha de Clienta"
                                    onClick={() => navigate(`/customers/${customer.id}`)}
                                    style={{ borderRadius: '6px', padding: '4px 8px' }}
                                  >
                                    <ExternalLink size={14} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </DashboardLayout>
  );
}
