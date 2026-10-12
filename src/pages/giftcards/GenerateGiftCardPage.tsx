import { useEffect, useMemo, useState } from 'react';
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
  printOrDownloadGiftCardPdf,
  isBlankGiftCardBeneficiary,
  sendGiftCardWhatsApp,
  shareGiftCardPng,
} from '@/utils/giftcardRenderer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

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

  const handleDownloadPdf = async () => {
    if (!createdInfo) return;
    try {
      await printOrDownloadGiftCardPdf({
        beneficiaryName: createdInfo.beneficiaryName,
        code: createdInfo.code,
        pin: createdInfo.plainPin || 'No disponible',
        expiresOn: createdInfo.expiresOn,
        publicUrl: createdInfo.publicUrl,
      });
      toast.success('Abriendo vista de impresión / PDF');
    } catch {
      toast.error('No se pudo generar el documento PDF');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-bunny-text tracking-tight flex items-center gap-2">
              <span>🎁</span> Generar GiftCard
            </h1>
            <p className="text-sm text-bunny-text-muted mt-1">
              Completa los datos de beneficiaria, servicios y pago para emitir la giftcard.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/giftcards')}>
              Volver al listado
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center justify-between shadow-sm">
            <span className="text-sm font-medium">{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="text-rose-500 hover:text-rose-700 text-sm font-semibold ml-4"
              aria-label="Cerrar alerta"
            >
              ✕
            </button>
          </div>
        )}

        {createdInfo && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-emerald-900 flex items-center gap-2">
                  <span>🎉</span> ¡GiftCard creada con éxito!
                </h3>
                <div className="text-xs text-emerald-800 mt-1">
                  Código: <strong className="font-mono">{createdInfo.code}</strong> &nbsp;|&nbsp; PIN:{' '}
                  <strong className="font-mono text-rose-600">{createdInfo.plainPin || 'No disponible'}</strong> &nbsp;|&nbsp; Vence:{' '}
                  <strong className="font-semibold">{createdInfo.expiresOn}</strong>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreatedInfo(null)}
                className="border-emerald-300 text-emerald-800 hover:bg-emerald-100/50"
              >
                + Emitir otra GiftCard
              </Button>
            </div>

            <div className="giftcard-admin-preview my-4">
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

            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-emerald-200">
              <Button
                variant="success"
                size="sm"
                onClick={handleShareGiftCard}
                disabled={sharingGiftCard}
                isLoading={sharingGiftCard}
              >
                🎁 Generar y compartir PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendWhatsApp}
                className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
              >
                📱 Enviar a WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPng}
                disabled={downloadingPng}
                isLoading={downloadingPng}
              >
                📥 Descargar PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
              >
                📄 Imprimir / PDF
              </Button>
              <a
                href={createdInfo.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-xs px-3 py-1.5 rounded-lg border border-bunny-primary text-bunny-primary hover:bg-bunny-primary hover:text-white font-medium transition-colors"
              >
                🌐 Ver URL pública
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/giftcards')}
              >
                Ir al listado
              </Button>
            </div>
          </div>
        )}

        <Card>
          <Card.Body>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="p-4 rounded-xl border border-bunny-border bg-bunny-primary-light/20 flex flex-col gap-1.5">
                <label htmlFor="blank-giftcard-switch" className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="blank-giftcard-switch"
                    className="w-4 h-4 rounded text-bunny-primary focus:ring-bunny-primary/30 border-bunny-border accent-bunny-primary"
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
                  <span className="text-sm font-semibold text-bunny-primary">
                    🎁 GiftCard al portador / En blanco (para sorteos, concursos o regalo abierto)
                  </span>
                </label>
                <small className="text-bunny-text-muted pl-7 block">
                  {isBlankGiftCard
                    ? 'No se requiere ingresar clienta ahora. La clienta se registrará con todos sus datos (RUT, puntos, etc.) al momento de cobrar/canjear la GiftCard.'
                    : 'Permite buscar o ingresar los datos de la clienta beneficiaria antes de emitir.'}
                </small>
              </div>

              {isBlankGiftCard ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                      Identificador / Título en Tarjeta
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text placeholder:text-bunny-cocoa-light/60 focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                      placeholder="Ej: Al portador, Ganadora Sorteo Instagram, etc."
                      value={createData.beneficiaryFullName}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, beneficiaryFullName: e.target.value }))}
                    />
                    <small className="text-bunny-text-muted mt-1 block">
                      Se mostrará en la tarjeta PNG descargable y compartible.
                    </small>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                      Vencimiento *
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                      value={createData.expiresOn}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, expiresOn: e.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                      Beneficiaria - Teléfono *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        autoFocus
                        placeholder="+569..."
                        className="flex-1 rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                        value={createData.beneficiaryPhone}
                        onChange={(e) => {
                          setCreateData((prev) => ({ ...prev, beneficiaryPhone: e.target.value }));
                          setLookupStatus('idle');
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleLookupBeneficiary}
                        disabled={lookupLoading}
                        isLoading={lookupLoading}
                      >
                        Buscar
                      </Button>
                    </div>
                    <small className={`mt-1 block ${lookupStatus === 'found' ? 'text-emerald-600 font-medium' : lookupStatus === 'not_found' ? 'text-amber-600 font-medium' : 'text-bunny-text-muted'}`}>
                      {lookupStatus === 'found'
                        ? '✓ Cliente existente detectado. Se usarán datos guardados.'
                        : lookupStatus === 'not_found'
                          ? 'ⓘ Cliente no registrado. Completa nombre/email manualmente.'
                          : 'Primero busca por teléfono antes de generar la GiftCard.'}
                    </small>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                      Beneficiaria - Nombre *
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      disabled={lookupStatus === 'idle'}
                      className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary disabled:bg-slate-50 disabled:text-slate-400"
                      value={createData.beneficiaryFullName}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, beneficiaryFullName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                      Beneficiaria - Email
                    </label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      disabled={lookupStatus === 'idle'}
                      className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary disabled:bg-slate-50 disabled:text-slate-400"
                      value={createData.beneficiaryEmail}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, beneficiaryEmail: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                      Vencimiento *
                    </label>
                    <input
                      type="date"
                      disabled={lookupStatus === 'idle'}
                      className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary disabled:bg-slate-50 disabled:text-slate-400"
                      value={createData.expiresOn}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, expiresOn: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-bunny-border/50">
                <div>
                  <label className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                    Compradora - Nombre
                  </label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    disabled={!isBlankGiftCard && lookupStatus === 'idle'}
                    className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary disabled:bg-slate-50 disabled:text-slate-400"
                    value={createData.buyerName}
                    onChange={(e) => setCreateData((prev) => ({ ...prev, buyerName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                    Compradora - Teléfono
                  </label>
                  <input
                    type="tel"
                    placeholder="Opcional"
                    disabled={!isBlankGiftCard && lookupStatus === 'idle'}
                    className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary disabled:bg-slate-50 disabled:text-slate-400"
                    value={createData.buyerPhone}
                    onChange={(e) => setCreateData((prev) => ({ ...prev, buyerPhone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                    Compradora - Email
                  </label>
                  <input
                    type="email"
                    placeholder="Opcional"
                    disabled={!isBlankGiftCard && lookupStatus === 'idle'}
                    className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary disabled:bg-slate-50 disabled:text-slate-400"
                    value={createData.buyerEmail}
                    onChange={(e) => setCreateData((prev) => ({ ...prev, buyerEmail: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                    Método de pago *
                  </label>
                  <select
                    disabled={!isBlankGiftCard && lookupStatus === 'idle'}
                    className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary disabled:bg-slate-50 disabled:text-slate-400"
                    value={createData.paymentMethod}
                    onChange={(e) =>
                      setCreateData((prev) => ({ ...prev, paymentMethod: e.target.value as GiftCardPaymentMethod }))
                    }
                  >
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  </select>
                </div>
                <div className="md:col-span-4 flex items-center justify-end pt-2">
                  <div className="text-right">
                    <span className="text-xs text-bunny-text-muted block">Total a pagar</span>
                    <span className="text-2xl font-black text-bunny-primary tracking-tight">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-bunny-border">
                <h3 className="text-sm font-bold text-bunny-text uppercase tracking-wider mb-3">
                  Servicios incluidos
                </h3>
                {loadingServices && (
                  <p className="text-xs text-bunny-text-muted mb-2">Cargando servicios...</p>
                )}
                <div className="divide-y divide-bunny-border/40 border border-bunny-border rounded-xl overflow-hidden bg-white">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-bunny-paper/40 transition-colors"
                    >
                      <div>
                        <span className="text-sm font-medium text-bunny-text">{service.name}</span>
                        <span className="text-xs text-bunny-text-muted ml-2 font-mono">
                          {formatCurrency(Number(service.price))}
                        </span>
                      </div>
                      <div className="w-full sm:w-32">
                        <input
                          type="number"
                          min={0}
                          className="w-full rounded-lg border border-bunny-border bg-white px-3 py-1.5 text-sm text-right font-medium focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary disabled:bg-slate-50 disabled:text-slate-400"
                          value={quantities[service.id] || 0}
                          disabled={!isBlankGiftCard && lookupStatus === 'idle'}
                          onChange={(e) =>
                            setQuantities((prev) => ({
                              ...prev,
                              [service.id]: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-bunny-border">
                <Button variant="outline" onClick={() => navigate('/giftcards')}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || (!isBlankGiftCard && lookupStatus === 'idle')}
                  isLoading={loading}
                >
                  Generar GiftCard
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>
      </div>
    </DashboardLayout>
  );
}
