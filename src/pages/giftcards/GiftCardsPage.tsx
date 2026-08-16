import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Table, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { customersApi } from '@/api/customers.api';
import DashboardLayout from '@/components/common/DashboardLayout';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useGiftCardsStore } from '@/stores/giftcardsStore';
import { useServicesStore } from '@/stores/servicesStore';
import { useCustomersStore } from '@/stores/customersStore';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import { Customer } from '@/types/customer.types';
import { GiftCard, GiftCardCreateRequest, GiftCardPaymentMethod, GiftCardStatus } from '@/types/giftcard.types';
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
const loadStoredPins = (): Record<number, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ADMIN_GIFTCARD_PINS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return Object.entries(parsed).reduce<Record<number, string>>((acc, [key, value]) => {
      const id = Number(key);
      if (Number.isFinite(id) && value) acc[id] = value;
      return acc;
    }, {});
  } catch {
    return {};
  }
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
  const navigate = useNavigate();
  const toast = useToast();
  const { services, fetchServices } = useServicesStore();
  const { customers, fetchCustomers: loadStoreCustomers } = useCustomersStore();
  const {
    giftCards,
    loading,
    error,
    fetchGiftCards,
    fetchGiftCardById,
    currentGiftCard,
    createGiftCard,
    updateGiftCard,
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
  const [isBlankCreate, setIsBlankCreate] = useState(false);
  const [createData, setCreateData] = useState(defaultCreateState);
  const [serviceSelections, setServiceSelections] = useState<ServiceSelection[]>([]);
  const [redeemNote, setRedeemNote] = useState('');
  const [revertNote, setRevertNote] = useState('');
  const [overrideExpired, setOverrideExpired] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [redeemQuantities, setRedeemQuantities] = useState<Record<number, number>>({});
  const [revertQuantities, setRevertQuantities] = useState<Record<number, number>>({});
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [generatedPins, setGeneratedPins] = useState<Record<number, string>>(loadStoredPins);
  const [sharingGiftCard, setSharingGiftCard] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [giftCardToCancelFromList, setGiftCardToCancelFromList] = useState<GiftCard | null>(null);
  const [cancellingFromList, setCancellingFromList] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    fetchServices(true);
    fetchGiftCards();
    loadStoreCustomers();
  }, [fetchServices, fetchGiftCards, loadStoreCustomers]);

  useEffect(() => {
    localStorage.setItem(ADMIN_GIFTCARD_PINS_KEY, JSON.stringify(generatedPins));
  }, [generatedPins]);

  const selectedServices = useMemo(
    () => serviceSelections.filter((selection) => selection.quantity > 0),
    [serviceSelections]
  );

  const totalAmount = useMemo(
    () => selectedServices.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [selectedServices]
  );

  const assignSearchResults = useMemo(() => {
    if (!assignSearch.trim()) return customers.slice(0, 15);
    const q = assignSearch.trim().toLowerCase();
    return customers
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.rut && c.rut.toLowerCase().includes(q))
      )
      .slice(0, 20);
  }, [customers, assignSearch]);

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
    setLookupStatus('idle');
    setIsBlankCreate(false);
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
    setLookupStatus('idle');
    setIsBlankCreate(false);
    setShowCreateModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const isBlank = isBlankCreate;
    const normalizedPhone = isBlank ? '+56900000000' : normalizePhone(createData.beneficiaryPhone);
    const beneficiaryName = isBlank
      ? createData.beneficiaryFullName.trim() || 'Al portador'
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
      toast.success(isBlank ? 'GiftCard al portador creada con éxito' : 'GiftCard creada');
      if (created.plainPin) {
        setGeneratedPins((prev) => ({ ...prev, [created.id]: created.plainPin as string }));
      }
      setShowCreateModal(false);
      resetCreateState();
      await fetchGiftCardById(created.id);
      setShowDetailModal(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo crear la GiftCard'));
    }
  };

  const handleBindCustomerToGiftCard = async (customer: Customer) => {
    if (!currentGiftCard) return;
    setAssignLoading(true);
    try {
      const payload: GiftCardCreateRequest = {
        beneficiaryFullName: customer.fullName,
        beneficiaryPhone: customer.phone,
        beneficiaryEmail: customer.email || undefined,
        buyerName: currentGiftCard.buyerName || undefined,
        buyerPhone: currentGiftCard.buyerPhone || undefined,
        buyerEmail: currentGiftCard.buyerEmail || undefined,
        expiresOn: currentGiftCard.expiresOn,
        paidAmount: currentGiftCard.paidAmount,
        paymentMethod: currentGiftCard.paymentMethod,
        items: currentGiftCard.items.map((i) => ({
          serviceId: i.serviceId || 0,
          quantity: i.quantity,
        })),
      };
      await updateGiftCard(currentGiftCard.id, payload);
      await fetchGiftCardById(currentGiftCard.id);
      await fetchGiftCards();
      toast.success(`Clienta "${customer.fullName}" asociada exitosamente a la GiftCard`);
      setShowAssignModal(false);
      setShowNewCustomerModal(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo asociar la clienta a la GiftCard'));
    } finally {
      setAssignLoading(false);
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

    const isBlank =
      isBlankGiftCardBeneficiary(currentGiftCard.beneficiaryName) ||
      !currentGiftCard.beneficiaryCustomerId ||
      currentGiftCard.beneficiaryPhone === '+56900000000';

    if (isBlank) {
      toast.warning('Esta GiftCard está al portador. Debes asignar o registrar a la clienta antes de procesar el canje.');
      setShowAssignModal(true);
      return;
    }

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

  const handleCancelFromList = async () => {
    if (!giftCardToCancelFromList) return;
    setCancellingFromList(true);
    try {
      await cancelGiftCard(giftCardToCancelFromList.id, 'Anulación administrativa desde listado');
      toast.success('GiftCard anulada');
      setGiftCardToCancelFromList(null);
    } catch {
      toast.error('No se pudo anular la GiftCard');
    } finally {
      setCancellingFromList(false);
    }
  };

  const handleShareGiftCard = async () => {
    if (!currentGiftCard) return;

    const pinValue = currentGiftCard.plainPin || generatedPins[currentGiftCard.id] || 'No disponible';
    const expiry = currentGiftCard.expiresOn || '-';
    const beneficiary = currentGiftCard.beneficiaryName || 'Beneficiaria';
    const publicUrl = normalizeGiftCardPublicUrl(currentGiftCard.publicUrl, currentGiftCard.code);

    setSharingGiftCard(true);
    await shareGiftCardPng({
      data: {
        beneficiaryName: beneficiary,
        code: currentGiftCard.code,
        pin: pinValue,
        expiresOn: expiry,
        publicUrl,
      },
      beneficiaryPhone: currentGiftCard.beneficiaryPhone,
      onSuccess: (msg) => toast.success(msg),
      onError: (msg) => toast.error(msg),
      onInfo: (msg) => toast.info(msg),
    });
    setSharingGiftCard(false);
  };

  const handleSendWhatsAppBeneficiary = () => {
    if (!currentGiftCard) return;

    const pinValue = currentGiftCard.plainPin || generatedPins[currentGiftCard.id] || 'No disponible';
    const expiry = currentGiftCard.expiresOn || '-';
    const beneficiary = currentGiftCard.beneficiaryName || 'Beneficiaria';
    const publicUrl = normalizeGiftCardPublicUrl(currentGiftCard.publicUrl, currentGiftCard.code);

    sendGiftCardWhatsApp({
      data: {
        beneficiaryName: beneficiary,
        code: currentGiftCard.code,
        pin: pinValue,
        expiresOn: expiry,
        publicUrl,
      },
      beneficiaryPhone: currentGiftCard.beneficiaryPhone,
      onError: (msg) => toast.error(msg),
    });
  };

  const handleDownloadPng = async () => {
    if (!currentGiftCard) return;
    const pinValue = currentGiftCard.plainPin || generatedPins[currentGiftCard.id] || 'No disponible';
    const expiry = currentGiftCard.expiresOn || '-';
    const beneficiary = currentGiftCard.beneficiaryName || 'Beneficiaria';
    const publicUrl = normalizeGiftCardPublicUrl(currentGiftCard.publicUrl, currentGiftCard.code);

    setDownloadingPng(true);
    try {
      await downloadGiftCardPng({
        beneficiaryName: beneficiary,
        code: currentGiftCard.code,
        pin: pinValue,
        expiresOn: expiry,
        publicUrl,
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
            <h1>🎁 GiftCards</h1>
            <p className="text-muted">Crea, gestiona y canjea GiftCards por servicios.</p>
          </Col>
          <Col xs="auto">
            <div className="d-flex gap-2">
              <Button onClick={() => navigate('/giftcards/generar')} variant="outline-primary">
                Generar GiftCard
              </Button>
              <Button onClick={openCreateModal}>+ Nueva GiftCard</Button>
            </div>
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
                    {giftCards.map((giftCard) => {
                      const isBlank =
                        isBlankGiftCardBeneficiary(giftCard.beneficiaryName) ||
                        !giftCard.beneficiaryCustomerId ||
                        giftCard.beneficiaryPhone === '+56900000000';
                      return (
                        <tr key={giftCard.id}>
                          <td>{giftCard.code}</td>
                          <td>
                            {isBlank ? (
                              <>
                                <strong>{giftCard.beneficiaryName || 'Al portador'}</strong>
                                <Badge bg="light" text="dark" className="border ms-2">
                                  Al portador
                                </Badge>
                                <br />
                                <small className="text-muted">Por registrar en canje</small>
                              </>
                            ) : (
                              <>
                                {giftCard.beneficiaryName}
                                <br />
                                <small className="text-muted">{giftCard.beneficiaryPhone}</small>
                              </>
                            )}
                          </td>
                          <td>{giftCard.expiresOn}</td>
                          <td>{formatCurrency(giftCard.totalAmount)}</td>
                          <td>
                            <Badge bg={giftCard.status === 'ACTIVE' ? 'primary' : 'secondary'}>{giftCard.status}</Badge>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button size="sm" variant="outline-primary" onClick={() => openDetails(giftCard)}>
                                Ver detalle
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => setGiftCardToCancelFromList(giftCard)}
                                disabled={giftCard.status === 'CANCELLED'}
                              >
                                Eliminar
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
            <div className="mb-4 p-3 rounded border bg-light-subtle">
              <Form.Check
                type="switch"
                id="blank-create-switch"
                label="🎁 GiftCard al portador / En blanco (para sorteos o regalo abierto)"
                className="fw-semibold text-primary"
                checked={isBlankCreate}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsBlankCreate(checked);
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
                {isBlankCreate
                  ? 'No se requiere ingresar clienta ahora. Se registrará con todos sus datos (RUT, puntos, etc.) al cobrar la GiftCard.'
                  : 'Permite buscar o ingresar los datos de la clienta beneficiaria antes de emitir.'}
              </small>
            </div>

            {isBlankCreate ? (
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
                  <Form.Label>Beneficiaria - Teléfono *</Form.Label>
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
                        ? 'Telefono no registrado. Completa nombre/email manualmente.'
                        : 'Primero busca por telefono antes de crear la GiftCard.'}
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
                  disabled={!isBlankCreate && lookupStatus === 'idle'}
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label>Compradora - Teléfono</Form.Label>
                <Form.Control
                  value={createData.buyerPhone}
                  onChange={(e) => setCreateData((prev) => ({ ...prev, buyerPhone: e.target.value }))}
                  disabled={!isBlankCreate && lookupStatus === 'idle'}
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label>Compradora - Email</Form.Label>
                <Form.Control
                  type="email"
                  value={createData.buyerEmail}
                  onChange={(e) => setCreateData((prev) => ({ ...prev, buyerEmail: e.target.value }))}
                  disabled={!isBlankCreate && lookupStatus === 'idle'}
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label>Método de pago *</Form.Label>
                <Form.Select
                  value={createData.paymentMethod}
                  onChange={(e) =>
                    setCreateData((prev) => ({ ...prev, paymentMethod: e.target.value as GiftCardPaymentMethod }))
                  }
                  disabled={!isBlankCreate && lookupStatus === 'idle'}
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
                      disabled={!isBlankCreate && lookupStatus === 'idle'}
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
            <Button type="submit" disabled={!isBlankCreate && lookupStatus === 'idle'}>
              Crear GiftCard
            </Button>
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
              {(() => {
                const isBlankBeneficiary =
                  isBlankGiftCardBeneficiary(currentGiftCard.beneficiaryName) ||
                  !currentGiftCard.beneficiaryCustomerId ||
                  currentGiftCard.beneficiaryPhone === '+56900000000';

                return (
                  <>
                    {isBlankBeneficiary && (
                      <Alert variant="warning" className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3 shadow-sm border-warning">
                        <div>
                          <strong>🎁 GiftCard al Portador / En blanco:</strong> Esta tarjeta no tiene clienta asignada. Para canjear servicios y registrar sus visitas/sellos, debes asociar los datos de la clienta.
                        </div>
                        <Button
                          variant="warning"
                          size="sm"
                          className="fw-semibold"
                          onClick={() => {
                            loadStoreCustomers();
                            setShowAssignModal(true);
                          }}
                        >
                          ➕ Asignar / Registrar Clienta
                        </Button>
                      </Alert>
                    )}

                    <div className="giftcard-admin-preview mb-3">
                      <img
                        src={GIFTCARD_BACKGROUND_TEMPLATE}
                        alt="Plantilla GiftCard BunnyCure"
                        className="giftcard-admin-preview__image"
                      />
                      <div className="giftcard-admin-preview__overlay">
                        <div className="giftcard-admin-preview__info">
                          <div className="giftcard-admin-preview__title">GiftCard BunnyCure</div>
                          <div className="giftcard-admin-preview__line">
                            <strong>
                              {isBlankBeneficiary ? 'GiftCard al Portador' : currentGiftCard.beneficiaryName}
                            </strong>
                          </div>
                          <div className="giftcard-admin-preview__line">Código: {currentGiftCard.code}</div>
                          <div className="giftcard-admin-preview__pin">
                            PIN: {currentGiftCard.plainPin || generatedPins[currentGiftCard.id] || 'No disponible'}
                          </div>
                          <div className="giftcard-admin-preview__line"><small>Vence: {currentGiftCard.expiresOn}</small></div>
                        </div>
                        <div className="giftcard-admin-preview__qr">
                          <QRCodeSVG
                            value={normalizeGiftCardPublicUrl(currentGiftCard.publicUrl, currentGiftCard.code)}
                            size={68}
                            bgColor="#ffffff"
                            fgColor="#8c2f74"
                          />
                          <span className="giftcard-admin-preview__qr-label">QR Canje</span>
                        </div>
                      </div>
                    </div>
                    <Row className="mb-3">
                      <Col md={4}>
                        <div><strong>Código:</strong> {currentGiftCard.code}</div>
                        <div><strong>Estado:</strong> {currentGiftCard.status}</div>
                        <div><strong>Vence:</strong> {currentGiftCard.expiresOn}</div>
                      </Col>
                      <Col md={4}>
                        {isBlankBeneficiary ? (
                          <div className="p-2 rounded bg-light border">
                            <Badge bg="warning" text="dark" className="mb-1">Al portador (sin asignar)</Badge>
                            <div><strong>Nombre:</strong> {currentGiftCard.beneficiaryName || 'Al portador'}</div>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                loadStoreCustomers();
                                setShowAssignModal(true);
                              }}
                            >
                              ➕ Asignar / Crear Clienta
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <div><strong>Beneficiaria:</strong> {currentGiftCard.beneficiaryName}</div>
                            <div><strong>Teléfono:</strong> {currentGiftCard.beneficiaryPhone}</div>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 text-decoration-none mt-1"
                              onClick={() => {
                                loadStoreCustomers();
                                setShowAssignModal(true);
                              }}
                            >
                              ✏️ Cambiar clienta asignada
                            </Button>
                          </div>
                        )}
                      </Col>
                      <Col md={4}>
                        <div><strong>Total:</strong> {formatCurrency(currentGiftCard.totalAmount)}</div>
                        <div><strong>Pagado:</strong> {formatCurrency(currentGiftCard.paidAmount)}</div>
                        <div className="text-danger">
                          <strong>PIN:</strong> {currentGiftCard.plainPin || generatedPins[currentGiftCard.id] || 'No disponible'}
                        </div>
                      </Col>
                    </Row>
                  </>
                );
              })()}

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

              <div className="d-flex flex-wrap gap-2 mb-3">
                <Button variant="outline-danger" onClick={handleCancel}>
                  Anular GiftCard
                </Button>
                <a
                  className="btn btn-outline-primary"
                  href={normalizeGiftCardPublicUrl(currentGiftCard.publicUrl, currentGiftCard.code)}
                  target="_blank"
                  rel="noreferrer"
                >
                  🌐 Abrir URL pública
                </a>
                <Button
                  variant="outline-success"
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
                  variant="outline-secondary"
                  onClick={handleDownloadPng}
                  disabled={downloadingPng}
                >
                  {downloadingPng ? 'Descargando...' : '📥 Descargar PNG'}
                </Button>
                <Button variant="success" onClick={handleSendWhatsAppBeneficiary}>
                  📱 Enviar WhatsApp
                </Button>
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

      {/* Modal para Buscar o Asignar Clienta */}
      <Modal
        show={showAssignModal}
        onHide={() => setShowAssignModal(false)}
        size="lg"
        centered
        className="bunny-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Asignar Clienta a GiftCard {currentGiftCard?.code}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            Para registrar los servicios canjeados en el historial, puntos/sellos de fidelidad y ficha de cliente, vincula esta GiftCard a una clienta existente o regístrala como clienta regular nueva.
          </Alert>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">Buscar Clienta Existente</h6>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowNewCustomerModal(true)}
            >
              ➕ Crear Nueva Clienta Regular
            </Button>
          </div>

          <Form.Control
            type="text"
            placeholder="Buscar por nombre, teléfono (+569...) o RUT"
            value={assignSearch}
            onChange={(e) => setAssignSearch(e.target.value)}
            className="mb-3"
          />

          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {assignSearchResults.length === 0 ? (
              <p className="text-muted text-center py-3">No se encontraron clientas coincidentes.</p>
            ) : (
              <Table size="sm" hover className="align-middle">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>RUT</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {assignSearchResults.map((cust) => (
                    <tr key={cust.id}>
                      <td className="fw-semibold">{cust.fullName}</td>
                      <td>{cust.phone}</td>
                      <td>{cust.rut || '-'}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-success"
                          disabled={assignLoading}
                          onClick={() => handleBindCustomerToGiftCard(cust)}
                        >
                          {assignLoading ? 'Asignando...' : 'Asignar a GiftCard'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Creación Completa de Cliente Regular */}
      <CustomerFormModal
        show={showNewCustomerModal}
        onHide={() => setShowNewCustomerModal(false)}
        onSuccess={(newCust) => handleBindCustomerToGiftCard(newCust)}
      />

      <ConfirmDialog
        show={Boolean(giftCardToCancelFromList)}
        title="Eliminar GiftCard"
        message={`¿Seguro que deseas eliminar/anular la GiftCard ${giftCardToCancelFromList?.code || ''}?`}
        variant="danger"
        confirmText="Eliminar"
        onConfirm={handleCancelFromList}
        onCancel={() => setGiftCardToCancelFromList(null)}
        loading={cancellingFromList}
      />
    </DashboardLayout>
  );
}
