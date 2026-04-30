import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import DashboardLayout from '@/components/common/DashboardLayout';
import { useGiftCardsStore } from '@/stores/giftcardsStore';
import { useServicesStore } from '@/stores/servicesStore';
import { GiftCard, GiftCardCreateRequest, GiftCardPaymentMethod, GiftCardStatus } from '@/types/giftcard.types';
import { useToast } from '@/hooks/useToast';

const formatCurrency = (value: number) => `$${value.toLocaleString('es-CL')}`;

const getDefaultExpiryDate = (): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
};

interface ServiceSelection {
  serviceId: number;
  name: string;
  price: number;
  quantity: number;
}

const defaultCreateState = {
  beneficiaryFullName: '',
  beneficiaryPhone: '',
  beneficiaryEmail: '',
  buyerName: '',
  buyerPhone: '',
  buyerEmail: '',
  expiresOn: getDefaultExpiryDate(),
  paymentMethod: 'EFECTIVO' as GiftCardPaymentMethod,
};

export default function GiftCardsPage() {
  const toast = useToast();
  const { services, fetchServices } = useServicesStore();
  const {
    giftCards,
    loading,
    error,
    fetchGiftCards,
    fetchGiftCardById,
    currentGiftCard,
    createGiftCard,
    redeemGiftCard,
    revertGiftCardRedeem,
    cancelGiftCard,
    clearError,
  } = useGiftCardsStore();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<GiftCardStatus | ''>('');
  const [expiringBefore, setExpiringBefore] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [createData, setCreateData] = useState(defaultCreateState);
  const [serviceSelections, setServiceSelections] = useState<ServiceSelection[]>([]);
  const [redeemNote, setRedeemNote] = useState('');
  const [revertNote, setRevertNote] = useState('');
  const [overrideExpired, setOverrideExpired] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [redeemQuantities, setRedeemQuantities] = useState<Record<number, number>>({});
  const [revertQuantities, setRevertQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchServices(true);
    fetchGiftCards();
  }, [fetchServices, fetchGiftCards]);

  const selectedServices = useMemo(
    () => serviceSelections.filter((selection) => selection.quantity > 0),
    [serviceSelections]
  );

  const totalAmount = useMemo(
    () => selectedServices.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [selectedServices]
  );

  const applyFilters = () => {
    fetchGiftCards({
      search: search || undefined,
      status: status || undefined,
      expiringBefore: expiringBefore || undefined,
    });
  };

  const resetCreateState = () => {
    setCreateData(defaultCreateState);
    setServiceSelections((prev) => prev.map((item) => ({ ...item, quantity: 0 })));
  };

  const openCreateModal = () => {
    const defaultExpiryDate = getDefaultExpiryDate();
    const initialSelections = services.map((service) => ({
      serviceId: service.id,
      name: service.name,
      price: Number(service.price),
      quantity: 0,
    }));
    setCreateData({
      ...defaultCreateState,
      expiresOn: defaultExpiryDate,
    });
    setServiceSelections(initialSelections);
    setShowCreateModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createData.beneficiaryFullName.trim() || !createData.beneficiaryPhone.trim()) {
      toast.error('Nombre y teléfono de beneficiaria son obligatorios');
      return;
    }
    if (selectedServices.length === 0) {
      toast.error('Selecciona al menos un servicio');
      return;
    }
    if (!createData.expiresOn) {
      toast.error('Debes seleccionar fecha de vencimiento');
      return;
    }

    const payload: GiftCardCreateRequest = {
      beneficiaryFullName: createData.beneficiaryFullName.trim(),
      beneficiaryPhone: createData.beneficiaryPhone.trim(),
      beneficiaryEmail: createData.beneficiaryEmail.trim() || undefined,
      buyerName: createData.buyerName.trim() || undefined,
      buyerPhone: createData.buyerPhone.trim() || undefined,
      buyerEmail: createData.buyerEmail.trim() || undefined,
      expiresOn: createData.expiresOn,
      paidAmount: totalAmount,
      paymentMethod: createData.paymentMethod,
      items: selectedServices.map((service) => ({
        serviceId: service.serviceId,
        quantity: service.quantity,
      })),
    };

    try {
      const created = await createGiftCard(payload);
      toast.success('GiftCard creada');
      setShowCreateModal(false);
      resetCreateState();
      await fetchGiftCardById(created.id);
      setShowDetailModal(true);
    } catch {
      toast.error('No se pudo crear la GiftCard');
    }
  };

  const openDetails = async (giftCard: GiftCard) => {
    try {
      await fetchGiftCardById(giftCard.id);
      setShowDetailModal(true);
    } catch {
      toast.error('No se pudo cargar detalle de GiftCard');
    }
  };

  const handleRedeem = async () => {
    if (!currentGiftCard) return;
    const items = currentGiftCard.items
      .map((item) => ({ giftCardItemId: item.id, quantity: redeemQuantities[item.id] || 0 }))
      .filter((item) => item.quantity > 0);

    if (!redeemNote.trim()) {
      toast.error('La nota de canje es obligatoria');
      return;
    }
    if (items.length === 0) {
      toast.error('Selecciona cantidades a canjear');
      return;
    }
    if (overrideExpired && !overrideReason.trim()) {
      toast.error('Debes indicar motivo de override');
      return;
    }

    try {
      await redeemGiftCard(currentGiftCard.id, {
        note: redeemNote.trim(),
        allowExpiredOverride: overrideExpired,
        overrideReason: overrideExpired ? overrideReason.trim() : undefined,
        items,
      });
      toast.success('Canje realizado');
      setRedeemNote('');
      setOverrideExpired(false);
      setOverrideReason('');
      setRedeemQuantities({});
    } catch {
      toast.error('No se pudo realizar el canje');
    }
  };

  const handleRevert = async () => {
    if (!currentGiftCard) return;
    const items = currentGiftCard.items
      .map((item) => ({ giftCardItemId: item.id, quantity: revertQuantities[item.id] || 0 }))
      .filter((item) => item.quantity > 0);

    if (!revertNote.trim()) {
      toast.error('La nota de reversa es obligatoria');
      return;
    }
    if (items.length === 0) {
      toast.error('Selecciona cantidades a revertir');
      return;
    }

    try {
      await revertGiftCardRedeem(currentGiftCard.id, {
        note: revertNote.trim(),
        items,
      });
      toast.success('Canje revertido');
      setRevertNote('');
      setRevertQuantities({});
    } catch {
      toast.error('No se pudo revertir el canje');
    }
  };

  const handleCancel = async () => {
    if (!currentGiftCard) return;
    try {
      await cancelGiftCard(currentGiftCard.id, 'Anulación administrativa');
      toast.success('GiftCard anulada');
    } catch {
      toast.error('No se pudo anular la GiftCard');
    }
  };

  return (
    <DashboardLayout>
      <div className="bunny-page">
        <Row className="mb-4">
          <Col>
            <h1>🎁 GiftCards</h1>
            <p className="text-muted">Crea, gestiona y canjea GiftCards por servicios.</p>
          </Col>
          <Col xs="auto">
            <Button onClick={openCreateModal}>+ Nueva GiftCard</Button>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" onClose={clearError} dismissible>
            {error}
          </Alert>
        )}

        <Card className="mb-3">
          <Card.Body>
            <Row className="g-2">
              <Col md={4}>
                <Form.Control
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por código, nombre o teléfono"
                />
              </Col>
              <Col md={3}>
                <Form.Select value={status} onChange={(e) => setStatus(e.target.value as GiftCardStatus | '')}>
                  <option value="">Todos los estados</option>
                  <option value="ACTIVE">ACTIVA</option>
                  <option value="PARTIAL">PARCIAL</option>
                  <option value="REDEEMED">CANJEADA</option>
                  <option value="EXPIRED">VENCIDA</option>
                  <option value="CANCELLED">ANULADA</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Control
                  type="date"
                  value={expiringBefore}
                  onChange={(e) => setExpiringBefore(e.target.value)}
                />
              </Col>
              <Col md={2} className="d-grid">
                <Button variant="secondary" onClick={applyFilters}>
                  Filtrar
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            {loading ? (
              <div className="text-center py-3">Cargando...</div>
            ) : (
              <div className="table-responsive">
                <Table striped hover>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Beneficiaria</th>
                      <th>Vence</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giftCards.map((giftCard) => (
                      <tr key={giftCard.id}>
                        <td>{giftCard.code}</td>
                        <td>
                          {giftCard.beneficiaryName}
                          <br />
                          <small className="text-muted">{giftCard.beneficiaryPhone}</small>
                        </td>
                        <td>{giftCard.expiresOn}</td>
                        <td>{formatCurrency(giftCard.totalAmount)}</td>
                        <td>
                          <Badge bg={giftCard.status === 'ACTIVE' ? 'primary' : 'secondary'}>{giftCard.status}</Badge>
                        </td>
                        <td>
                          <Button size="sm" variant="outline-primary" onClick={() => openDetails(giftCard)}>
                            Ver detalle
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>

      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        size="lg"
        scrollable
        fullscreen="sm-down"
        className="bunny-modal giftcard-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Crear GiftCard</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <Row>
              <Col md={6} className="mb-3">
                <Form.Label>Beneficiaria - Nombre *</Form.Label>
                <Form.Control
                  value={createData.beneficiaryFullName}
                  onChange={(e) => setCreateData((prev) => ({ ...prev, beneficiaryFullName: e.target.value }))}
                />
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label>Beneficiaria - Teléfono *</Form.Label>
                <Form.Control
                  value={createData.beneficiaryPhone}
                  onChange={(e) => setCreateData((prev) => ({ ...prev, beneficiaryPhone: e.target.value }))}
                />
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label>Beneficiaria - Email</Form.Label>
                <Form.Control
                  type="email"
                  value={createData.beneficiaryEmail}
                  onChange={(e) => setCreateData((prev) => ({ ...prev, beneficiaryEmail: e.target.value }))}
                />
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label>Vencimiento *</Form.Label>
                <Form.Control
                  type="date"
                  value={createData.expiresOn}
                  onChange={(e) => setCreateData((prev) => ({ ...prev, expiresOn: e.target.value }))}
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label>Compradora - Nombre</Form.Label>
                <Form.Control
                  value={createData.buyerName}
                  onChange={(e) => setCreateData((prev) => ({ ...prev, buyerName: e.target.value }))}
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label>Compradora - Teléfono</Form.Label>
                <Form.Control
                  value={createData.buyerPhone}
                  onChange={(e) => setCreateData((prev) => ({ ...prev, buyerPhone: e.target.value }))}
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label>Compradora - Email</Form.Label>
                <Form.Control
                  type="email"
                  value={createData.buyerEmail}
                  onChange={(e) => setCreateData((prev) => ({ ...prev, buyerEmail: e.target.value }))}
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label>Método de pago *</Form.Label>
                <Form.Select
                  value={createData.paymentMethod}
                  onChange={(e) =>
                    setCreateData((prev) => ({ ...prev, paymentMethod: e.target.value as GiftCardPaymentMethod }))
                  }
                >
                  <option value="EFECTIVO">EFECTIVO</option>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                </Form.Select>
              </Col>
              <Col md={8} className="mb-3 d-flex align-items-end">
                <div className="fw-semibold">Total GiftCard: {formatCurrency(totalAmount)}</div>
              </Col>
            </Row>
            <hr />
            <h6>Servicios incluidos</h6>
            <div className="d-flex flex-column gap-2">
              {serviceSelections.map((selection) => (
                <Row key={selection.serviceId} className="align-items-center">
                  <Col md={7}>
                    {selection.name} <small className="text-muted">{formatCurrency(selection.price)}</small>
                  </Col>
                  <Col md={5}>
                    <Form.Control
                      type="number"
                      min={0}
                      value={selection.quantity}
                      onChange={(e) =>
                        setServiceSelections((prev) =>
                          prev.map((item) =>
                            item.serviceId === selection.serviceId
                              ? { ...item, quantity: Math.max(0, Number(e.target.value) || 0) }
                              : item
                          )
                        )
                      }
                    />
                  </Col>
                </Row>
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear GiftCard</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="xl"
        scrollable
        fullscreen="sm-down"
        className="bunny-modal giftcard-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Detalle GiftCard</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!currentGiftCard ? (
            <div>Cargando...</div>
          ) : (
            <>
              <Row className="mb-3">
                <Col md={4}>
                  <div><strong>Código:</strong> {currentGiftCard.code}</div>
                  <div><strong>Estado:</strong> {currentGiftCard.status}</div>
                  <div><strong>Vence:</strong> {currentGiftCard.expiresOn}</div>
                </Col>
                <Col md={4}>
                  <div><strong>Beneficiaria:</strong> {currentGiftCard.beneficiaryName}</div>
                  <div><strong>Teléfono:</strong> {currentGiftCard.beneficiaryPhone}</div>
                </Col>
                <Col md={4}>
                  <div><strong>Total:</strong> {formatCurrency(currentGiftCard.totalAmount)}</div>
                  <div><strong>Pagado:</strong> {formatCurrency(currentGiftCard.paidAmount)}</div>
                  {currentGiftCard.plainPin && (
                    <div className="text-danger"><strong>PIN:</strong> {currentGiftCard.plainPin}</div>
                  )}
                </Col>
              </Row>

              <h6>Servicios</h6>
              <Table size="sm" bordered>
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th>Total</th>
                    <th>Canjeado</th>
                    <th>Disponible</th>
                    <th>Canjear</th>
                    <th>Revertir</th>
                  </tr>
                </thead>
                <tbody>
                  {currentGiftCard.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.serviceName}</td>
                      <td>{item.quantity}</td>
                      <td>{item.redeemedQuantity}</td>
                      <td>{item.remainingQuantity}</td>
                      <td>
                        <Form.Control
                          type="number"
                          min={0}
                          max={item.remainingQuantity}
                          value={redeemQuantities[item.id] || 0}
                          onChange={(e) =>
                            setRedeemQuantities((prev) => ({
                              ...prev,
                              [item.id]: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min={0}
                          max={item.redeemedQuantity}
                          value={revertQuantities[item.id] || 0}
                          onChange={(e) =>
                            setRevertQuantities((prev) => ({
                              ...prev,
                              [item.id]: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <Row className="g-2 mb-2">
                <Col md={6}>
                  <Form.Label>Nota de canje *</Form.Label>
                  <Form.Control value={redeemNote} onChange={(e) => setRedeemNote(e.target.value)} />
                </Col>
                <Col md={6}>
                  <Form.Label>Override por vencimiento</Form.Label>
                  <Form.Check
                    type="checkbox"
                    label="Permitir canje vencido (admin)"
                    checked={overrideExpired}
                    onChange={(e) => setOverrideExpired(e.target.checked)}
                  />
                  {overrideExpired && (
                    <Form.Control
                      className="mt-2"
                      placeholder="Motivo override"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                    />
                  )}
                </Col>
              </Row>

              <Row className="g-2 mb-3">
                <Col md={6}>
                  <Button className="w-100" onClick={handleRedeem}>
                    Canjear seleccionados
                  </Button>
                </Col>
                <Col md={6}>
                  <Form.Label>Nota de reversa *</Form.Label>
                  <Form.Control value={revertNote} onChange={(e) => setRevertNote(e.target.value)} />
                  <Button className="w-100 mt-2" variant="outline-warning" onClick={handleRevert}>
                    Revertir seleccionados
                  </Button>
                </Col>
              </Row>

              <div className="d-flex gap-2 mb-3">
                <Button variant="outline-danger" onClick={handleCancel}>
                  Anular GiftCard
                </Button>
                <a className="btn btn-outline-primary" href={currentGiftCard.publicUrl} target="_blank" rel="noreferrer">
                  Abrir URL pública
                </a>
              </div>

              <h6>Historial</h6>
              <Table size="sm" striped>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Evento</th>
                    <th>Actor</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentGiftCard.events || []).map((event) => (
                    <tr key={event.id}>
                      <td>{new Date(event.createdAt).toLocaleString('es-CL')}</td>
                      <td>{event.eventType}</td>
                      <td>{event.actorUsername || event.actor}</td>
                      <td>{event.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
      </Modal>
    </DashboardLayout>
  );
}
