import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/common/DashboardLayout';
import { customersApi } from '@/api/customers.api';
import { useServicesStore } from '@/stores/servicesStore';
import { useGiftCardsStore } from '@/stores/giftcardsStore';
import { GiftCardCreateRequest, GiftCardPaymentMethod } from '@/types/giftcard.types';
import { useToast } from '@/hooks/useToast';
import giftCardTemplate from '../../../giftcard_bunnycure.svg';

const formatCurrency = (value: number) => `$${value.toLocaleString('es-CL')}`;
const ADMIN_GIFTCARD_PINS_KEY = 'admin-giftcard-pins';
type ApiError = { response?: { data?: { error?: { message?: string }; message?: string } } };
const getApiErrorMessage = (error: unknown, fallback: string) => {
  const err = error as ApiError;
  return err.response?.data?.error?.message || err.response?.data?.message || fallback;
};

const getDefaultExpiryDate = (): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
};

const normalizePhone = (value?: string): string => {
  if (!value) return '';
  const trimmed = value.trim();
  const hasLeadingPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return '';
  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
};

interface ServiceSelection {
  serviceId: number;
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

export default function GenerateGiftCardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { services, isLoading: loadingServices, fetchServices } = useServicesStore();
  const { loading, error, clearError, createGiftCard } = useGiftCardsStore();

  const [createData, setCreateData] = useState(defaultCreateState);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [createdInfo, setCreatedInfo] = useState<{ code: string; publicUrl: string; plainPin: string | null; beneficiaryName: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'found' | 'not_found'>('idle');

  useEffect(() => {
    fetchServices(true);
  }, [fetchServices]);

  const selectedServices = useMemo(
    () =>
      services
        .map((service): ServiceSelection => ({ serviceId: service.id, quantity: quantities[service.id] || 0 }))
        .filter((selection) => selection.quantity > 0),
    [services, quantities]
  );

  const totalAmount = useMemo(
    () =>
      services.reduce((sum, service) => sum + Number(service.price) * (quantities[service.id] || 0), 0),
    [services, quantities]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = normalizePhone(createData.beneficiaryPhone);
    if (!createData.beneficiaryFullName.trim() || !normalizedPhone) {
      toast.error('Nombre y telefono de beneficiaria son obligatorios');
      return;
    }
    if (lookupStatus === 'idle') {
      toast.error('Primero busca la beneficiaria por telefono');
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
      beneficiaryPhone: normalizedPhone,
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
      setCreatedInfo({
        code: created.code,
        publicUrl: created.publicUrl,
        plainPin: created.plainPin,
        beneficiaryName: createData.beneficiaryFullName.trim(),
      });
      if (created.plainPin) {
        const currentRaw = localStorage.getItem(ADMIN_GIFTCARD_PINS_KEY);
        const current = currentRaw ? (JSON.parse(currentRaw) as Record<string, string>) : {};
        current[String(created.id)] = created.plainPin;
        localStorage.setItem(ADMIN_GIFTCARD_PINS_KEY, JSON.stringify(current));
      }
      setCreateData({
        ...defaultCreateState,
        expiresOn: getDefaultExpiryDate(),
      });
      setQuantities({});
      setLookupStatus('idle');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo crear la GiftCard'));
    }
  };

  const handleLookupBeneficiary = async () => {
    const normalizedPhone = normalizePhone(createData.beneficiaryPhone);
    if (!normalizedPhone) {
      toast.error('Ingresa un telefono valido para buscar');
      return;
    }

    setLookupLoading(true);
    try {
      const result = await customersApi.lookupFlexible(normalizedPhone);
      if (result.exists && result.customer) {
        setCreateData((prev) => ({
          ...prev,
          beneficiaryPhone: result.customer?.phone || normalizedPhone,
          beneficiaryFullName: result.customer?.fullName || prev.beneficiaryFullName,
          beneficiaryEmail: result.customer?.email || '',
        }));
        setLookupStatus('found');
        toast.success('Cliente encontrado, datos autocompletados');
      } else {
        setCreateData((prev) => ({
          ...prev,
          beneficiaryPhone: normalizedPhone,
          beneficiaryFullName: '',
          beneficiaryEmail: '',
        }));
        setLookupStatus('not_found');
        toast.info('Telefono no registrado. Completa los datos para crear la GiftCard');
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo buscar cliente por telefono'));
      setLookupStatus('idle');
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="bunny-page">
        <Row className="mb-4">
          <Col>
            <h1>🎁 Generar GiftCard</h1>
            <p className="text-muted mb-0">Completa los datos de beneficiaria, servicios y pago para emitir la giftcard.</p>
          </Col>
          <Col xs="auto" className="d-flex align-items-start gap-2">
            <Button variant="outline-secondary" onClick={() => navigate('/giftcards')}>
              Volver
            </Button>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" onClose={clearError} dismissible>
            {error}
          </Alert>
        )}

        {createdInfo && (
          <Alert variant="success">
            GiftCard <strong>{createdInfo.code}</strong> creada correctamente.{' '}
            {createdInfo.plainPin && (
              <>
                PIN: <strong>{createdInfo.plainPin}</strong>.{' '}
              </>
            )}
            <div className="giftcard-admin-preview mt-3 mb-2">
              <img src={giftCardTemplate} alt="Plantilla GiftCard BunnyCure" className="giftcard-admin-preview__image" />
              <div className="giftcard-admin-preview__overlay">
                <div className="giftcard-admin-preview__title">GiftCard BunnyCure</div>
                <div className="giftcard-admin-preview__line">{createdInfo.beneficiaryName || 'Beneficiaria'}</div>
                <div className="giftcard-admin-preview__line">Codigo: {createdInfo.code}</div>
                <div className="giftcard-admin-preview__pin">PIN: {createdInfo.plainPin || 'No disponible'}</div>
              </div>
            </div>
            <a href={createdInfo.publicUrl} target="_blank" rel="noreferrer">
              Abrir URL publica
            </a>{' '}
            o{' '}
            <button
              type="button"
              className="btn btn-link p-0 align-baseline"
              onClick={() => navigate('/giftcards')}
            >
              volver al listado
            </button>
            .
          </Alert>
        )}

        <Card>
          <Card.Body>
            <Form onSubmit={handleCreate}>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Label>Beneficiaria - Nombre *</Form.Label>
                  <Form.Control
                    value={createData.beneficiaryFullName}
                    onChange={(e) => setCreateData((prev) => ({ ...prev, beneficiaryFullName: e.target.value }))}
                  />
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Label>Beneficiaria - Telefono *</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      value={createData.beneficiaryPhone}
                      onChange={(e) => {
                        setCreateData((prev) => ({ ...prev, beneficiaryPhone: e.target.value }));
                        setLookupStatus('idle');
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline-primary"
                      onClick={handleLookupBeneficiary}
                      disabled={lookupLoading}
                    >
                      {lookupLoading ? 'Buscando...' : 'Buscar'}
                    </Button>
                  </div>
                  <Form.Text className={lookupStatus === 'found' ? 'text-success' : 'text-muted'}>
                    {lookupStatus === 'found'
                      ? 'Cliente existente detectado. Se usaran datos guardados.'
                      : lookupStatus === 'not_found'
                        ? 'Cliente no registrado. Completa nombre/email manualmente.'
                        : 'Primero busca por telefono antes de generar la GiftCard.'}
                  </Form.Text>
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
                  <Form.Label>Compradora - Telefono</Form.Label>
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
                  <Form.Label>Metodo de pago *</Form.Label>
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
              {loadingServices && <p className="text-muted mb-2">Cargando servicios...</p>}
              <div className="d-flex flex-column gap-2 mb-4">
                {services.map((service) => (
                  <Row key={service.id} className="align-items-center">
                    <Col md={7}>
                      {service.name} <small className="text-muted">{formatCurrency(Number(service.price))}</small>
                    </Col>
                    <Col md={5}>
                      <Form.Control
                        type="number"
                        min={0}
                        value={quantities[service.id] || 0}
                        onChange={(e) =>
                          setQuantities((prev) => ({
                            ...prev,
                            [service.id]: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                      />
                    </Col>
                  </Row>
                ))}
              </div>

              <div className="d-flex gap-2">
                <Button variant="outline-secondary" onClick={() => navigate('/giftcards')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Generando...' : 'Generar GiftCard'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </DashboardLayout>
  );
}
