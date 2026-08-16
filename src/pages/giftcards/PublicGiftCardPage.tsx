import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Table } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { giftcardsApi } from '@/api/giftcards.api';
import { GiftCard } from '@/types/giftcard.types';
import { useToast } from '@/hooks/useToast';
import { isBlankGiftCardBeneficiary } from '@/utils/giftcardRenderer';

export default function PublicGiftCardPage() {
  const { code } = useParams();
  const toast = useToast();
  const [giftCard, setGiftCard] = useState<GiftCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [note, setNote] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientRut, setClientRut] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const loadGiftCard = async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const data = await giftcardsApi.getPublicByCode(code);
      setGiftCard(data);
    } catch {
      setError('No se pudo cargar la GiftCard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGiftCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleRedeem = async () => {
    if (!code || !giftCard) return;
    const isBlank =
      isBlankGiftCardBeneficiary(giftCard.beneficiaryName) ||
      !giftCard.beneficiaryCustomerId ||
      giftCard.beneficiaryPhone === '+56900000000';

    if (isBlank) {
      if (!clientName.trim() || !clientPhone.trim()) {
        toast.error('Por favor ingresa tu nombre y teléfono para registrar el canje');
        return;
      }
    }

    const items = giftCard.items
      .map((item) => ({ giftCardItemId: item.id, quantity: quantities[item.id] || 0 }))
      .filter((item) => item.quantity > 0);

    if (!pin.trim()) {
      toast.error('PIN requerido');
      return;
    }
    if (!note.trim() && !isBlank) {
      toast.error('La nota es obligatoria');
      return;
    }
    if (items.length === 0) {
      toast.error('Selecciona cantidades a canjear');
      return;
    }

    const finalNote = isBlank
      ? `[Canje al portador - Cliente: ${clientName.trim()} | Tel: ${clientPhone.trim()} | RUT: ${clientRut.trim() || 'N/A'}] ${note.trim()}`
      : note.trim();

    try {
      const updated = await giftcardsApi.redeemPublic(code, {
        pin: pin.trim(),
        note: finalNote,
        items,
      });
      setGiftCard(updated);
      setPin('');
      setNote('');
      setClientName('');
      setClientPhone('');
      setClientRut('');
      setQuantities({});
      toast.success('Canje realizado con éxito');
    } catch {
      toast.error('No se pudo canjear la GiftCard. Verifica que el PIN sea correcto.');
    }
  };

  const isBlankCard = giftCard
    ? isBlankGiftCardBeneficiary(giftCard.beneficiaryName) ||
      !giftCard.beneficiaryCustomerId ||
      giftCard.beneficiaryPhone === '+56900000000'
    : false;

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4">
              <h2 className="mb-1 text-primary">🎁 GiftCard BunnyCure</h2>
              <p className="text-muted mb-4">Consulta de saldo y canje en línea</p>

              {loading && <div className="text-center py-4 text-muted">Cargando datos de la GiftCard...</div>}
              {error && <Alert variant="danger">{error}</Alert>}

              {!loading && giftCard && (
                <>
                  <Row className="mb-3 p-3 bg-light rounded g-2">
                    <Col sm={4}><strong>Código:</strong> {giftCard.code}</Col>
                    <Col sm={4}>
                      <strong>Estado:</strong>{' '}
                      <Badge bg={giftCard.status === 'ACTIVE' ? 'success' : 'secondary'}>{giftCard.status}</Badge>
                    </Col>
                    <Col sm={4}><strong>Vencimiento:</strong> {giftCard.expiresOn}</Col>
                  </Row>
                  <Row className="mb-3">
                    <Col md={12}>
                      <strong>Beneficiaria:</strong>{' '}
                      {isBlankCard ? (
                        <span className="text-muted">
                          🎁 Tarjeta al Portador <Badge bg="info" className="ms-1">Sin destinatario fijo</Badge>
                        </span>
                      ) : (
                        <span>{giftCard.beneficiaryName} ({giftCard.beneficiaryPhone})</span>
                      )}
                    </Col>
                  </Row>

                  <h5 className="mt-4 mb-2">Servicios Incluidos</h5>
                  <Table bordered size="sm" className="mb-4">
                    <thead>
                      <tr className="table-light">
                        <th>Servicio</th>
                        <th>Total</th>
                        <th>Disponible</th>
                        <th>Cantidad a canjear</th>
                      </tr>
                    </thead>
                    <tbody>
                      {giftCard.items.map((item) => (
                        <tr key={item.id}>
                          <td className="fw-semibold">{item.serviceName}</td>
                          <td>{item.quantity}</td>
                          <td>
                            <Badge bg={item.remainingQuantity > 0 ? 'success' : 'secondary'}>
                              {item.remainingQuantity}
                            </Badge>
                          </td>
                          <td>
                            <Form.Control
                              type="number"
                              min={0}
                              max={item.remainingQuantity}
                              value={quantities[item.id] || 0}
                              onChange={(e) =>
                                setQuantities((prev) => ({
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

                  {isBlankCard && (
                    <div className="p-3 mb-4 rounded border bg-light-subtle">
                      <h6 className="text-primary mb-2">📝 Datos de quien canjea la GiftCard</h6>
                      <small className="text-muted d-block mb-3">
                        Al ser una GiftCard al portador, requerimos tus datos para asociar el servicio a tu perfil de cliente BunnyCure.
                      </small>
                      <Row className="g-2">
                        <Col md={4}>
                          <Form.Label>Nombre Completo *</Form.Label>
                          <Form.Control
                            placeholder="Ej: Laura Pérez"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                          />
                        </Col>
                        <Col md={4}>
                          <Form.Label>Teléfono *</Form.Label>
                          <Form.Control
                            placeholder="Ej: +56912345678"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                          />
                        </Col>
                        <Col md={4}>
                          <Form.Label>RUT</Form.Label>
                          <Form.Control
                            placeholder="Ej: 12.345.678-9"
                            value={clientRut}
                            onChange={(e) => setClientRut(e.target.value)}
                          />
                        </Col>
                      </Row>
                    </div>
                  )}

                  <Row className="g-2">
                    <Col md={4}>
                      <Form.Label>PIN de canje (6 dígitos) *</Form.Label>
                      <Form.Control
                        type="password"
                        placeholder="Ingresa tu PIN"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                      />
                    </Col>
                    <Col md={8}>
                      <Form.Label>Nota / Observación</Form.Label>
                      <Form.Control
                        placeholder="Ej: Canje en sucursal o para agendamiento"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </Col>
                  </Row>

                  <Button className="mt-4 px-4" variant="primary" onClick={handleRedeem}>
                    Canjear GiftCard
                  </Button>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
