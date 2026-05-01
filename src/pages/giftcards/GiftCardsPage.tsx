import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { customersApi } from '@/api/customers.api';
import DashboardLayout from '@/components/common/DashboardLayout';
import { useGiftCardsStore } from '@/stores/giftcardsStore';
import { useServicesStore } from '@/stores/servicesStore';
import { GiftCard, GiftCardCreateRequest, GiftCardPaymentMethod, GiftCardStatus } from '@/types/giftcard.types';
import { useToast } from '@/hooks/useToast';
import { normalizeGiftCardPublicUrl } from '@/utils/giftcardUrl';

const formatCurrency = (value: number) => `$${value.toLocaleString('es-CL')}`;
const giftCardTemplate = '/giftcard_bunnycure.svg';
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
const toWhatsAppPhone = (value?: string): string => {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('56')) return digits;
  if (digits.length === 9 && digits.startsWith('9')) return `56${digits}`;
  return digits;
};

interface GiftCardRenderTextData {
  beneficiaryName: string;
  code: string;
  pin: string;
  expiresOn: string;
}

interface GiftCardInfoBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const GIFTCARD_INFO_BOX_COLOR = { r: 0xd1, g: 0x6e, b: 0x6e };
const isGiftCardInfoColor = (imageData: Uint8ClampedArray, index: number): boolean =>
  imageData[index + 3] >= 220 &&
  Math.abs(imageData[index] - GIFTCARD_INFO_BOX_COLOR.r) <= 8 &&
  Math.abs(imageData[index + 1] - GIFTCARD_INFO_BOX_COLOR.g) <= 8 &&
  Math.abs(imageData[index + 2] - GIFTCARD_INFO_BOX_COLOR.b) <= 8;

const findGiftCardInfoBox = (context: CanvasRenderingContext2D, width: number, height: number): GiftCardInfoBox | null => {
  const imageData = context.getImageData(0, 0, width, height).data;
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const stack: number[] = [];
  let best: { count: number; minX: number; minY: number; maxX: number; maxY: number } | null = null;

  for (let pixel = 0; pixel < totalPixels; pixel += 1) {
    if (visited[pixel] !== 0) continue;
    visited[pixel] = 1;

    const pixelIndex = pixel * 4;
    if (!isGiftCardInfoColor(imageData, pixelIndex)) continue;

    let count = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    stack.push(pixel);
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined || visited[current] === 2) continue;
      visited[current] = 2;

      const currentIndex = current * 4;
      if (!isGiftCardInfoColor(imageData, currentIndex)) continue;

      const x = current % width;
      const y = Math.floor(current / width);
      count += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;

      if (x > 0) {
        const left = current - 1;
        if (visited[left] === 0) {
          visited[left] = 1;
          stack.push(left);
        }
      }
      if (x < width - 1) {
        const right = current + 1;
        if (visited[right] === 0) {
          visited[right] = 1;
          stack.push(right);
        }
      }
      if (y > 0) {
        const up = current - width;
        if (visited[up] === 0) {
          visited[up] = 1;
          stack.push(up);
        }
      }
      if (y < height - 1) {
        const down = current + width;
        if (visited[down] === 0) {
          visited[down] = 1;
          stack.push(down);
        }
      }
    }

    if (count === 0 || maxX < minX || maxY < minY) continue;
    if (!best || count > best.count) best = { count, minX, minY, maxX, maxY };
  }

  if (!best) return null;

  const boxWidth = best.maxX - best.minX + 1;
  const boxHeight = best.maxY - best.minY + 1;
  if (boxWidth < Math.floor(width * 0.25) || boxHeight < Math.floor(height * 0.15)) return null;

  return { x: best.minX, y: best.minY, width: boxWidth, height: boxHeight };
};

const fitText = (context: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
  if (context.measureText(text).width <= maxWidth) return text;

  let content = text;
  while (content.length > 3 && context.measureText(`${content}...`).width > maxWidth) {
    content = content.slice(0, -1);
  }
  return `${content.trimEnd()}...`;
};

const drawGiftCardInfo = (context: CanvasRenderingContext2D, box: GiftCardInfoBox, data: GiftCardRenderTextData): void => {
  const paddingX = Math.max(10, Math.floor(box.width * 0.06));
  const paddingY = Math.max(8, Math.floor(box.height * 0.08));
  const maxTextWidth = Math.max(10, box.width - paddingX * 2);
  const lineGap = Math.max(4, Math.floor(box.height * 0.04));
  let cursorY = box.y + paddingY;

  context.fillStyle = '#fffdfb';
  context.textBaseline = 'top';

  context.font = `700 ${Math.max(14, Math.min(24, Math.floor(box.height * 0.22)))}px "Segoe UI", Arial, sans-serif`;
  context.fillText(fitText(context, data.beneficiaryName || 'Beneficiaria', maxTextWidth), box.x + paddingX, cursorY, maxTextWidth);
  cursorY += Math.max(18, Math.floor(box.height * 0.22)) + lineGap;

  context.font = `700 ${Math.max(11, Math.min(18, Math.floor(box.height * 0.14)))}px "Segoe UI", Arial, sans-serif`;
  context.fillText(fitText(context, `CODIGO: ${data.code}`, maxTextWidth), box.x + paddingX, cursorY, maxTextWidth);
  cursorY += Math.max(15, Math.floor(box.height * 0.16)) + lineGap;
  context.fillText(fitText(context, `PIN: ${data.pin}`, maxTextWidth), box.x + paddingX, cursorY, maxTextWidth);
  cursorY += Math.max(15, Math.floor(box.height * 0.16)) + lineGap;
  context.fillText(fitText(context, `VENCE: ${data.expiresOn}`, maxTextWidth), box.x + paddingX, cursorY, maxTextWidth);
};

const renderGiftCardPng = async (svgMarkup: string, data: GiftCardRenderTextData): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const width = image.naturalWidth || image.width || 559;
      const height = image.naturalHeight || image.height || 397;
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const context = canvas.getContext('2d');

      if (!context) {
        URL.revokeObjectURL(svgUrl);
        reject(new Error('No se pudo inicializar canvas'));
        return;
      }

      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.drawImage(image, 0, 0, width, height);
      const infoBox = findGiftCardInfoBox(context, width, height);
      if (!infoBox) {
        URL.revokeObjectURL(svgUrl);
        reject(new Error('No se pudo detectar el recuadro #d16e6e para posicionar datos'));
        return;
      }
      drawGiftCardInfo(context, infoBox, data);
      canvas.toBlob((pngBlob) => {
        URL.revokeObjectURL(svgUrl);
        if (!pngBlob) {
          reject(new Error('No se pudo generar PNG'));
          return;
        }
        resolve(pngBlob);
      }, 'image/png');
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('No se pudo renderizar plantilla SVG'));
    };

    image.src = svgUrl;
  });

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
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [generatedPins, setGeneratedPins] = useState<Record<number, string>>(loadStoredPins);
  const [sharingGiftCard, setSharingGiftCard] = useState(false);

  useEffect(() => {
    fetchServices(true);
    fetchGiftCards();
  }, [fetchServices, fetchGiftCards]);

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
    setShowCreateModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = normalizePhone(createData.beneficiaryPhone);
    if (!createData.beneficiaryFullName.trim() || !normalizedPhone) {
      toast.error('Nombre y teléfono de beneficiaria son obligatorios');
      return;
    }
    if (lookupStatus === 'idle') {
      toast.error('Primero busca la beneficiaria por teléfono');
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

  const handleShareGiftCard = async () => {
    if (!currentGiftCard) return;

    const pinValue = currentGiftCard.plainPin || generatedPins[currentGiftCard.id] || 'No disponible';
    const expiry = currentGiftCard.expiresOn || '-';
    const beneficiary = currentGiftCard.beneficiaryName || 'Beneficiaria';
    const waPhone = toWhatsAppPhone(currentGiftCard.beneficiaryPhone);
    const publicUrl = normalizeGiftCardPublicUrl(currentGiftCard.publicUrl, currentGiftCard.code);
    const message =
      `Hola ${beneficiary}, aqui esta tu GiftCard BunnyCure.\n` +
      `Codigo: ${currentGiftCard.code}\n` +
      `PIN: ${pinValue}\n` +
      `Vence: ${expiry}\n` +
      `Link: ${publicUrl}`;

    setSharingGiftCard(true);
    try {
      const templateResponse = await fetch(giftCardTemplate, { cache: 'no-store' });
      if (!templateResponse.ok) {
        throw new Error('No se pudo cargar la plantilla de GiftCard');
      }

      const templateSvg = await templateResponse.text();
      const pngBlob = await renderGiftCardPng(templateSvg, {
        beneficiaryName: beneficiary,
        code: currentGiftCard.code,
        pin: pinValue,
        expiresOn: expiry,
      });
      const pngFile = new File([pngBlob], `giftcard-${currentGiftCard.code}.png`, { type: 'image/png' });
      const shareData: ShareData = { files: [pngFile], title: 'GiftCard BunnyCure', text: message };
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

      if (navigator.share && nav.canShare?.({ files: [pngFile] })) {
        await navigator.share(shareData);
        toast.success('GiftCard generada y compartida');
      } else {
        const fileUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = `giftcard-${currentGiftCard.code}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(fileUrl);

        if (waPhone) {
          const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
          window.open(waUrl, '_blank', 'noopener,noreferrer');
        }
        toast.info('PNG descargado. Se abrió WhatsApp para completar el envío');
      }
    } catch {
      toast.error('No se pudo generar o compartir la GiftCard');
    } finally {
      setSharingGiftCard(false);
    }
  };

  const handleSendWhatsAppBeneficiary = () => {
    if (!currentGiftCard) return;
    const waPhone = toWhatsAppPhone(currentGiftCard.beneficiaryPhone);
    if (!waPhone) {
      toast.error('La beneficiaria no tiene teléfono válido para WhatsApp');
      return;
    }

    const pinValue = currentGiftCard.plainPin || generatedPins[currentGiftCard.id] || 'No disponible';
    const publicUrl = normalizeGiftCardPublicUrl(currentGiftCard.publicUrl, currentGiftCard.code);
    const message =
      `Hola ${currentGiftCard.beneficiaryName}, aqui esta tu GiftCard BunnyCure.\n` +
      `Codigo: ${currentGiftCard.code}\n` +
      `PIN: ${pinValue}\n` +
      `Vence: ${currentGiftCard.expiresOn}\n` +
      `Link: ${publicUrl}`;
    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
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
              <div className="giftcard-admin-preview mb-3">
                <img src={giftCardTemplate} alt="Plantilla GiftCard BunnyCure" className="giftcard-admin-preview__image" />
                <div className="giftcard-admin-preview__overlay">
                  <div className="giftcard-admin-preview__title">GiftCard BunnyCure</div>
                  <div className="giftcard-admin-preview__line">{currentGiftCard.beneficiaryName}</div>
                  <div className="giftcard-admin-preview__line">Codigo: {currentGiftCard.code}</div>
                  <div className="giftcard-admin-preview__pin">
                    PIN: {currentGiftCard.plainPin || generatedPins[currentGiftCard.id] || 'No disponible'}
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
                  <div><strong>Beneficiaria:</strong> {currentGiftCard.beneficiaryName}</div>
                  <div><strong>Teléfono:</strong> {currentGiftCard.beneficiaryPhone}</div>
                </Col>
                <Col md={4}>
                  <div><strong>Total:</strong> {formatCurrency(currentGiftCard.totalAmount)}</div>
                  <div><strong>Pagado:</strong> {formatCurrency(currentGiftCard.paidAmount)}</div>
                  <div className="text-danger">
                    <strong>PIN:</strong> {currentGiftCard.plainPin || generatedPins[currentGiftCard.id] || 'No disponible'}
                  </div>
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
                <a
                  className="btn btn-outline-primary"
                  href={normalizeGiftCardPublicUrl(currentGiftCard.publicUrl, currentGiftCard.code)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir URL pública
                </a>
                <Button variant="outline-success" onClick={handleShareGiftCard} disabled={sharingGiftCard}>
                  {sharingGiftCard ? 'Generando...' : 'Generar y compartir PNG'}
                </Button>
                <Button variant="success" onClick={handleSendWhatsAppBeneficiary}>
                  Enviar a WhatsApp beneficiaria
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
    </DashboardLayout>
  );
}
