import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Table } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { giftcardsApi } from '@/api/giftcards.api';
import { GiftCard } from '@/types/giftcard.types';
import { useToast } from '@/hooks/useToast';

export default function PublicGiftCardPage() {
  const { code } = useParams();
  const toast = useToast();
  const [giftCard, setGiftCard] = useState<GiftCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [note, setNote] = useState('');
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
    const items = giftCard.items
      .map((item) => ({ giftCardItemId: item.id, quantity: quantities[item.id] || 0 }))
      .filter((item) => item.quantity > 0);

    if (!pin.trim()) {
      toast.error('PIN requerido');
      return;
    }
    if (!note.trim()) {
      toast.error('La nota es obligatoria');
      return;
    }
    if (items.length === 0) {
      toast.error('Selecciona cantidades a canjear');
      return;
    }

    try {
      const updated = await giftcardsApi.redeemPublic(code, {
        pin: pin.trim(),
        note: note.trim(),
        items,
      });
      setGiftCard(updated);
      setPin('');
      setNote('');
      setQuantities({});
      toast.success('Canje realizado');
    } catch {
      toast.error('No se pudo canjear la GiftCard');
    }
  };

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card>
            <Card.Body>
              <h2 className="mb-1">🎁 GiftCard</h2>
              <p className="text-muted mb-4">Vista pública para consulta y canje</p>

              {loading && <div>Cargando...</div>}
              {error && <Alert variant="danger">{error}</Alert>}

              {!loading && giftCard && (
                <>
                  <Row className="mb-3">
                    <Col md={4}><strong>Código:</strong> {giftCard.code}</Col>
                    <Col md={4}><strong>Estado:</strong> {giftCard.status}</Col>
                    <Col md={4}><strong>Vencimiento:</strong> {giftCard.expiresOn}</Col>
                  </Row>
                  <Row className="mb-3">
                    <Col md={6}><strong>Beneficiaria:</strong> {giftCard.beneficiaryName}</Col>
                    <Col md={6}><strong>Teléfono:</strong> {giftCard.beneficiaryPhone}</Col>
                  </Row>

                  <Table bordered size="sm" className="mb-3">
                    <thead>
                      <tr>
                        <th>Servicio</th>
                        <th>Total</th>
                        <th>Disponible</th>
                        <th>Cantidad a canjear</th>
                      </tr>
                    </thead>
                    <tbody>
                      {giftCard.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.serviceName}</td>
                          <td>{item.quantity}</td>
                          <td>{item.remainingQuantity}</td>
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

                  <Row className="g-2">
                    <Col md={4}>
                      <Form.Label>PIN de canje</Form.Label>
                      <Form.Control value={pin} onChange={(e) => setPin(e.target.value)} />
                    </Col>
                    <Col md={8}>
                      <Form.Label>Nota de canje</Form.Label>
                      <Form.Control value={note} onChange={(e) => setNote(e.target.value)} />
                    </Col>
                  </Row>

                  <Button className="mt-3" onClick={handleRedeem}>
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
