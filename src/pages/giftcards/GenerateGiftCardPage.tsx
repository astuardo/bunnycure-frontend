import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import DashboardLayout from '@/components/common/DashboardLayout';
import { customersApi } from '@/api/customers.api';
import { useServicesStore } from '@/stores/servicesStore';
import { useGiftCardsStore } from '@/stores/giftcardsStore';
import { GiftCardCreateRequest, GiftCardPaymentMethod } from '@/types/giftcard.types';
import { useToast } from '@/hooks/useToast';
import { normalizeGiftCardPublicUrl } from '@/utils/giftcardUrl';
import {
  GIFTCARD_BACKGROUND_TEMPLATE,
  downloadGiftCardPng,
  isBlankGiftCardBeneficiary,
  sendGiftCardWhatsApp,
  shareGiftCardPng,
} from '@/utils/giftcardRenderer';

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

interface CreatedGiftCardInfo {
  code: string;
  publicUrl: string;
  plainPin: string | null;
  beneficiaryName: string;
  beneficiaryPhone: string;
  expiresOn: string;
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

  const [isBlankGiftCard, setIsBlankGiftCard] = useState(false);
  const [createData, setCreateData] = useState(defaultCreateState);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [createdInfo, setCreatedInfo] = useState<CreatedGiftCardInfo | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [sharingGiftCard, setSharingGiftCard] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);

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
    const isBlank = isBlankGiftCard;
    const normalizedPhone = isBlank
      ? '+56900000000'
      : normalizePhone(createData.beneficiaryPhone);
    const beneficiaryName = isBlank
      ? (createData.beneficiaryFullName.trim() || 'Al portador')
      : createData.beneficiaryFullName.trim();

    if (!isBlank) {
      if (!beneficiaryName || !normalizedPhone) {
        toast.error('Nombre y teléfono de beneficiaria son obligatorios');
        return;
      }
      if (lookupStatus === 'idle') {
        toast.error('Primero busca la beneficiaria por teléfono');
        return;
      }
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
      beneficiaryFullName: beneficiaryName,
      beneficiaryPhone: normalizedPhone,
      beneficiaryEmail: !isBlank && createData.beneficiaryEmail.trim() ? createData.beneficiaryEmail.trim() : undefined,
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
      toast.success(isBlank ? 'GiftCard al portador creada con éxito' : 'GiftCard creada con éxito');
      setCreatedInfo({
        code: created.code,
        publicUrl: normalizeGiftCardPublicUrl(created.publicUrl, created.code),
        plainPin: created.plainPin,
        beneficiaryName: beneficiaryName,
        beneficiaryPhone: isBlank ? '' : normalizedPhone,
        expiresOn: createData.expiresOn,
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
      setIsBlankGiftCard(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo crear la GiftCard'));
    }
  };

  const handleLookupBeneficiary = async () => {
    const normalizedPhone = normalizePhone(createData.beneficiaryPhone);
    if (!normalizedPhone) {
      toast.error('Ingresa un teléfono válido para buscar');
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
        toast.info('Teléfono no registrado. Completa los datos para crear la GiftCard');
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo buscar cliente por teléfono'));
      setLookupStatus('idle');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleShareGiftCard = async () => {
    if (!createdInfo) return;
    setSharingGiftCard(true);
    await shareGiftCardPng({
      data: {
        beneficiaryName: createdInfo.beneficiaryName,
        code: createdInfo.code,
        pin: createdInfo.plainPin || 'No disponible',
        expiresOn: createdInfo.expiresOn,
        publicUrl: createdInfo.publicUrl,
      },
      beneficiaryPhone: createdInfo.beneficiaryPhone,
      onSuccess: (msg) => toast.success(msg),
      onError: (msg) => toast.error(msg),
      onInfo: (msg) => toast.info(msg),
    });
    setSharingGiftCard(false);
  };

  const handleSendWhatsApp = () => {
    if (!createdInfo) return;
    sendGiftCardWhatsApp({
      data: {
        beneficiaryName: createdInfo.beneficiaryName,
        code: createdInfo.code,
        pin: createdInfo.plainPin || 'No disponible',
        expiresOn: createdInfo.expiresOn,
        publicUrl: createdInfo.publicUrl,
      },
      beneficiaryPhone: createdInfo.beneficiaryPhone,
      onError: (msg) => toast.error(msg),
    });
  };

  const handleDownloadPng = async () => {
    if (!createdInfo) return;
    setDownloadingPng(true);
    try {
      await downloadGiftCardPng({
        beneficiaryName: createdInfo.beneficiaryName,
        code: createdInfo.code,
        pin: createdInfo.plainPin || 'No disponible',
        expiresOn: createdInfo.expiresOn,
        publicUrl: createdInfo.publicUrl,
      });
      toast.success('PNG descargado correctamente');
    } catch {
      toast.error('No se pudo descargar la imagen PNG');
    } finally {
      setDownloadingPng(false);
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
              Volver al listado
            </Button>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" onClose={clearError} dismissible>
            {error}
          </Alert>
        )}

        {createdInfo && (
          <Alert variant="success" className="mb-4 shadow-sm border-success">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <div>
                <h5 className="alert-heading mb-1">🎉 ¡GiftCard creada con éxito!</h5>
                <div>
                  Código: <strong>{createdInfo.code}</strong> &nbsp;|&nbsp; PIN:{' '}
                  <strong className="text-danger">{createdInfo.plainPin || 'No disponible'}</strong> &nbsp;|&nbsp; Vence:{' '}
                  <strong>{createdInfo.expiresOn}</strong>
                </div>
              </div>
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => setCreatedInfo(null)}
              >
                + Emitir otra GiftCard
              </Button>
            </div>

            <div className="giftcard-admin-preview my-3">
              <img
                src={GIFTCARD_BACKGROUND_TEMPLATE}
                alt="Plantilla GiftCard BunnyCure"
                className="giftcard-admin-preview__image"
              />
              <div className="giftcard-admin-preview__overlay">
                <div className="giftcard-admin-preview__info">
                  <div className="giftcard-admin-preview__title">GiftCard BunnyCure</div>
                  <div className="giftcard-admin-preview__line">
                    <strong>{isBlankGiftCardBeneficiary(createdInfo.beneficiaryName) ? 'GiftCard al Portador' : createdInfo.beneficiaryName}</strong>
                  </div>
                  <div className="giftcard-admin-preview__line">Código: {createdInfo.code}</div>
                  <div className="giftcard-admin-preview__pin">PIN: {createdInfo.plainPin || 'No disponible'}</div>
                  <div className="giftcard-admin-preview__line"><small>Vence: {createdInfo.expiresOn}</small></div>
                </div>
                <div className="giftcard-admin-preview__qr">
                  <QRCodeSVG value={createdInfo.publicUrl} size={68} bgColor="#ffffff" fgColor="#8c2f74" />
                  <span className="giftcard-admin-preview__qr-label">QR Canje</span>
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-3 pt-2 border-top border-success-subtle">
              <Button
                variant="success"
                onClick={handleShareGiftCard}
                disabled={sharingGiftCard}
              >
                {sharingGiftCard ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-1" />
                    Generando...
                  </>
                ) : (
                  '🎁 Generar y compartir PNG'
                )}
              </Button>
              <Button
                variant="outline-success"
                onClick={handleSendWhatsApp}
              >
                📱 Enviar a WhatsApp
              </Button>
              <Button
                variant="outline-secondary"
                onClick={handleDownloadPng}
                disabled={downloadingPng}
              >
                {downloadingPng ? 'Descargando...' : '📥 Descargar PNG'}
              </Button>
              <a
                href={createdInfo.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline-primary"
              >
                🌐 Ver URL pública
              </a>
              <Button
                variant="outline-dark"
                onClick={() => navigate('/giftcards')}
              >
                Ir al listado
              </Button>
            </div>
          </Alert>
        )}

        <Card>
          <Card.Body>
            <Form onSubmit={handleCreate}>
              <div className="mb-4 p-3 rounded border bg-light-subtle">
                <Form.Check
                  type="switch"
                  id="blank-giftcard-switch"
                  label="🎁 GiftCard al portador / En blanco (para sorteos, concursos o regalo abierto)"
                  className="fw-semibold text-primary"
                  checked={isBlankGiftCard}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsBlankGiftCard(checked);
                    if (checked) {
                      setCreateData((prev) => ({
                        ...prev,
                        beneficiaryFullName: prev.beneficiaryFullName || 'Al portador',
                        beneficiaryPhone: prev.beneficiaryPhone || '+56900000000',
                      }));
                    } else {
                      setCreateData((prev) => ({
                        ...prev,
                        beneficiaryFullName: '',
                        beneficiaryPhone: '',
                        beneficiaryEmail: '',
                      }));
                      setLookupStatus('idle');
                    }
                  }}
                />
                <small className="text-muted d-block mt-1">
                  {isBlankGiftCard
                    ? 'No se requiere ingresar clienta ahora. La clienta se registrará con todos sus datos (RUT, puntos, etc.) al momento de cobrar/canjear la GiftCard.'
                    : 'Permite buscar o ingresar los datos de la clienta beneficiaria antes de emitir.'}
                </small>
              </div>

              {isBlankGiftCard ? (
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Label>Identificador / Título en Tarjeta</Form.Label>
                    <Form.Control
                      placeholder="Ej: Al portador, Ganadora Sorteo Instagram, etc."
                      value={createData.beneficiaryFullName}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, beneficiaryFullName: e.target.value }))}
                    />
                    <Form.Text className="text-muted">
                      Se mostrará en la tarjeta PNG descargable y compartible.
                    </Form.Text>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Label>Vencimiento *</Form.Label>
                    <Form.Control
                      type="date"
                      value={createData.expiresOn}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, expiresOn: e.target.value }))}
                    />
                  </Col>
                </Row>
              ) : (
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Label>Beneficiaria - Nombre *</Form.Label>
                    <Form.Control
                      value={createData.beneficiaryFullName}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, beneficiaryFullName: e.target.value }))}
                      disabled={lookupStatus === 'idle'}
                    />
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Label>Beneficiaria - Telefono *</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        autoFocus
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
                      disabled={lookupStatus === 'idle'}
                    />
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Label>Vencimiento *</Form.Label>
                    <Form.Control
                      type="date"
                      value={createData.expiresOn}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, expiresOn: e.target.value }))}
                      disabled={lookupStatus === 'idle'}
                    />
                  </Col>
                </Row>
              )}

              <Row>
                <Col md={4} className="mb-3">
                  <Form.Label>Compradora - Nombre</Form.Label>
                  <Form.Control
                    value={createData.buyerName}
                    onChange={(e) => setCreateData((prev) => ({ ...prev, buyerName: e.target.value }))}
                    disabled={!isBlankGiftCard && lookupStatus === 'idle'}
                  />
                </Col>
                <Col md={4} className="mb-3">
                  <Form.Label>Compradora - Telefono</Form.Label>
                  <Form.Control
                    value={createData.buyerPhone}
                    onChange={(e) => setCreateData((prev) => ({ ...prev, buyerPhone: e.target.value }))}
                    disabled={!isBlankGiftCard && lookupStatus === 'idle'}
                  />
                </Col>
                <Col md={4} className="mb-3">
                  <Form.Label>Compradora - Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={createData.buyerEmail}
                    onChange={(e) => setCreateData((prev) => ({ ...prev, buyerEmail: e.target.value }))}
                    disabled={!isBlankGiftCard && lookupStatus === 'idle'}
                  />
                </Col>
                <Col md={4} className="mb-3">
                  <Form.Label>Metodo de pago *</Form.Label>
                  <Form.Select
                    value={createData.paymentMethod}
                    onChange={(e) =>
                      setCreateData((prev) => ({ ...prev, paymentMethod: e.target.value as GiftCardPaymentMethod }))
                    }
                    disabled={!isBlankGiftCard && lookupStatus === 'idle'}
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
                        disabled={!isBlankGiftCard && lookupStatus === 'idle'}
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
                <Button type="submit" disabled={loading || (!isBlankGiftCard && lookupStatus === 'idle')}>
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
