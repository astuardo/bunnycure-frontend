import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import DashboardLayout from '@/components/common/DashboardLayout';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useGiftCardsStore } from '@/stores/giftcardsStore';
import { useCustomersStore } from '@/stores/customersStore';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import { Customer } from '@/types/customer.types';
import { GiftCard, GiftCardCreateRequest, GiftCardStatus } from '@/types/giftcard.types';
import { useToast } from '@/hooks/useToast';
import { normalizeGiftCardPublicUrl } from '@/utils/giftcardUrl';
import { matchRutSearch } from '@/utils/rutUtils';
import {
  GIFTCARD_BACKGROUND_TEMPLATE,
  isBlankGiftCardBeneficiary,
  shareGiftCardPng,
} from '@/utils/giftcardRenderer';
import { Button } from '@/components/ui/Button';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';

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

const getStatusBadgeVariant = (status: GiftCardStatus): BadgeVariant => {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PARTIAL':
      return 'primary';
    case 'REDEEMED':
      return 'secondary';
    case 'EXPIRED':
      return 'warning';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'neutral';
  }
};

export default function GiftCardsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { directory: customers, fetchDirectory } = useCustomersStore();
  const {
    giftCards,
    loading,
    error,
    fetchGiftCards,
    fetchGiftCardById,
    currentGiftCard,
    updateGiftCard,
    redeemGiftCard,
    revertGiftCardRedeem,
    cancelGiftCard,
    clearError,
  } = useGiftCardsStore();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<GiftCardStatus | ''>('');
  const [expiringBefore, setExpiringBefore] = useState('');

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [redeemNote, setRedeemNote] = useState('');
  const [revertNote, setRevertNote] = useState('');
  const [overrideExpired, setOverrideExpired] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [redeemQuantities, setRedeemQuantities] = useState<Record<number, number>>({});
  const [revertQuantities, setRevertQuantities] = useState<Record<number, number>>({});
  const [generatedPins] = useState<Record<number, string>>(loadStoredPins);
  const [sharingGiftCard, setSharingGiftCard] = useState(false);
  const [giftCardToCancelFromList, setGiftCardToCancelFromList] = useState<GiftCard | null>(null);
  const [cancellingFromList, setCancellingFromList] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    fetchGiftCards();
    fetchDirectory();
  }, [fetchGiftCards, fetchDirectory]);

  useEffect(() => {
    localStorage.setItem(ADMIN_GIFTCARD_PINS_KEY, JSON.stringify(generatedPins));
  }, [generatedPins]);

  const assignSearchResults = useMemo(() => {
    if (!assignSearch.trim()) return customers.slice(0, 15);
    const q = assignSearch.trim().toLowerCase();
    return customers
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          matchRutSearch(q, c.rut)
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

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-bunny-text tracking-tight flex items-center gap-2">
              <span>🎁</span> GiftCards
            </h1>
            <p className="text-sm text-bunny-text-muted mt-1">
              Crea, gestiona y canjea GiftCards por servicios.
            </p>
          </div>
          <div>
            <Button
              onClick={() => navigate('/giftcards/generar')}
              variant="primary"
              className="bg-bunny-primary hover:bg-bunny-primary-hover text-white font-semibold shadow-xs"
            >
              + Generar GiftCard
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

        <Card>
          <Card.Body>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <input
                  type="text"
                  className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text placeholder:text-bunny-cocoa-light/60 focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por código, nombre o teléfono"
                />
              </div>
              <div className="md:col-span-3">
                <select
                  className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as GiftCardStatus | '')}
                >
                  <option value="">Todos los estados</option>
                  <option value="ACTIVE">ACTIVA</option>
                  <option value="PARTIAL">PARCIAL</option>
                  <option value="REDEEMED">CANJEADA</option>
                  <option value="EXPIRED">VENCIDA</option>
                  <option value="CANCELLED">ANULADA</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <input
                  type="date"
                  className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                  value={expiringBefore}
                  onChange={(e) => setExpiringBefore(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Button variant="secondary" fullWidth onClick={applyFilters}>
                  Filtrar
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-12 text-bunny-text-muted">
                <Spinner size="md" className="mx-auto mb-2" />
                Cargando GiftCards...
              </div>
            ) : giftCards.length === 0 ? (
              <div className="text-center py-12 text-bunny-text-muted">
                No se encontraron GiftCards registradas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-bunny-border bg-bunny-paper/60 text-xs font-semibold text-bunny-text-muted uppercase tracking-wider">
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Beneficiaria</th>
                      <th className="py-3 px-4">Vence</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bunny-border/40 text-sm">
                    {giftCards.map((giftCard) => {
                      const isBlank =
                        isBlankGiftCardBeneficiary(giftCard.beneficiaryName) ||
                        !giftCard.beneficiaryCustomerId ||
                        giftCard.beneficiaryPhone === '+56900000000';
                      return (
                        <tr key={giftCard.id} className="hover:bg-bunny-paper/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-bunny-primary">
                            {giftCard.code}
                          </td>
                          <td className="py-3 px-4">
                            {isBlank ? (
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-bunny-text">
                                    {giftCard.beneficiaryName || 'Al portador'}
                                  </span>
                                  <Badge variant="warning">Al portador</Badge>
                                </div>
                                <span className="text-xs text-bunny-text-muted">Por registrar en canje</span>
                              </div>
                            ) : (
                              <div>
                                <div className="font-semibold text-bunny-text">{giftCard.beneficiaryName}</div>
                                <span className="text-xs text-bunny-text-muted">{giftCard.beneficiaryPhone}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-bunny-text font-mono text-xs">{giftCard.expiresOn}</td>
                          <td className="py-3 px-4 font-bold text-bunny-text">{formatCurrency(giftCard.totalAmount)}</td>
                          <td className="py-3 px-4">
                            <Badge variant={getStatusBadgeVariant(giftCard.status)}>{giftCard.status}</Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => openDetails(giftCard)}>
                                Ver detalle
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
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
                </table>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>

      {/* Modal Detalle GiftCard */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="xl"
      >
        <Modal.Header closeButton>
          <Modal.Title>Detalle GiftCard</Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          {!currentGiftCard ? (
            <div className="text-center py-8 text-bunny-text-muted">Cargando...</div>
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
                      <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                        <div className="text-xs">
                          <strong className="text-sm">🎁 GiftCard al Portador / En blanco:</strong> Esta tarjeta no tiene clienta asignada. Para canjear servicios y registrar sus visitas/sellos, debes asociar los datos de la clienta.
                        </div>
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => {
                            fetchDirectory(true);
                            setShowAssignModal(true);
                          }}
                        >
                          ➕ Asignar / Registrar Clienta
                        </Button>
                      </div>
                    )}

                    <div className="giftcard-admin-preview mb-4">
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-bunny-border bg-bunny-paper/40 text-sm">
                      <div className="space-y-1">
                        <div><strong>Código:</strong> <span className="font-mono">{currentGiftCard.code}</span></div>
                        <div><strong>Estado:</strong> <Badge variant={getStatusBadgeVariant(currentGiftCard.status)}>{currentGiftCard.status}</Badge></div>
                        <div><strong>Vence:</strong> {currentGiftCard.expiresOn}</div>
                      </div>
                      <div>
                        {isBlankBeneficiary ? (
                          <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200">
                            <Badge variant="warning" className="mb-1">Al portador (sin asignar)</Badge>
                            <div className="text-xs"><strong>Nombre:</strong> {currentGiftCard.beneficiaryName || 'Al portador'}</div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 text-xs"
                              onClick={() => {
                                fetchDirectory(true);
                                setShowAssignModal(true);
                              }}
                            >
                              ➕ Asignar / Crear Clienta
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div><strong>Beneficiaria:</strong> {currentGiftCard.beneficiaryName}</div>
                            <div><strong>Teléfono:</strong> {currentGiftCard.beneficiaryPhone}</div>
                            <button
                              type="button"
                              className="text-xs text-bunny-primary hover:underline font-semibold block mt-1"
                              onClick={() => {
                                fetchDirectory(true);
                                setShowAssignModal(true);
                              }}
                            >
                              ✏️ Cambiar clienta asignada
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div><strong>Total:</strong> {formatCurrency(currentGiftCard.totalAmount)}</div>
                        <div><strong>Pagado:</strong> {formatCurrency(currentGiftCard.paidAmount)}</div>
                        <div className="text-rose-600 font-medium">
                          <strong>PIN:</strong> <span className="font-mono">{currentGiftCard.plainPin || generatedPins[currentGiftCard.id] || 'No disponible'}</span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="pt-2">
                <h4 className="text-xs font-bold text-bunny-text uppercase tracking-wider mb-2">Servicios</h4>
                <div className="overflow-x-auto border border-bunny-border rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-bunny-paper/60 text-xs text-bunny-text-muted font-semibold border-b border-bunny-border uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Servicio</th>
                        <th className="py-2.5 px-3">Total</th>
                        <th className="py-2.5 px-3">Canjeado</th>
                        <th className="py-2.5 px-3">Disponible</th>
                        <th className="py-2.5 px-3">Canjear</th>
                        <th className="py-2.5 px-3">Revertir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bunny-border/30">
                      {currentGiftCard.items.map((item) => (
                        <tr key={item.id} className="hover:bg-bunny-paper/30">
                          <td className="py-2.5 px-3 font-medium text-bunny-text">{item.serviceName}</td>
                          <td className="py-2.5 px-3">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-emerald-700 font-semibold">{item.redeemedQuantity}</td>
                          <td className="py-2.5 px-3 text-bunny-primary font-semibold">{item.remainingQuantity}</td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min={0}
                              max={item.remainingQuantity}
                              className="w-20 rounded-lg border border-bunny-border bg-white px-2 py-1 text-xs text-right font-medium focus:outline-none focus:ring-1 focus:ring-bunny-primary"
                              value={redeemQuantities[item.id] || 0}
                              onChange={(e) =>
                                setRedeemQuantities((prev) => ({
                                  ...prev,
                                  [item.id]: Math.max(0, Number(e.target.value) || 0),
                                }))
                              }
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min={0}
                              max={item.redeemedQuantity}
                              className="w-20 rounded-lg border border-bunny-border bg-white px-2 py-1 text-xs text-right font-medium focus:outline-none focus:ring-1 focus:ring-bunny-primary"
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
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-bunny-border bg-bunny-paper/30">
                <div className="space-y-3">
                  <div>
                    <label htmlFor="gift-cards-nota-de-canje" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                      Nota de canje *
                    </label>
                    <input id="gift-cards-nota-de-canje"
                      type="text"
                      className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                      value={redeemNote}
                      onChange={(e) => setRedeemNote(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-bunny-text">
                      <input
                        type="checkbox"
                        className="rounded border-bunny-border text-bunny-primary focus:ring-bunny-primary/30"
                        checked={overrideExpired}
                        onChange={(e) => setOverrideExpired(e.target.checked)}
                      />
                      Permitir canje vencido (override admin)
                    </label>
                    {overrideExpired && (
                      <input
                        type="text"
                        className="w-full mt-2 rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                        placeholder="Motivo override..."
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                      />
                    )}
                  </div>
                  <Button fullWidth onClick={handleRedeem}>
                    Canjear seleccionados
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="gift-cards-nota-de-reversa" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                      Nota de reversa *
                    </label>
                    <input id="gift-cards-nota-de-reversa"
                      type="text"
                      className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                      value={revertNote}
                      onChange={(e) => setRevertNote(e.target.value)}
                    />
                  </div>
                  <Button fullWidth variant="warning" onClick={handleRevert}>
                    Revertir seleccionados
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-bunny-border">
                <Button variant="danger" size="sm" onClick={handleCancel}>
                  Anular GiftCard
                </Button>
                <a
                  className="inline-flex items-center text-xs px-3 py-1.5 rounded-lg border border-bunny-primary text-bunny-primary hover:bg-bunny-primary hover:text-white font-medium transition-colors"
                  href={normalizeGiftCardPublicUrl(currentGiftCard.publicUrl, currentGiftCard.code)}
                  target="_blank"
                  rel="noreferrer"
                >
                  🌐 Abrir URL pública
                </a>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleShareGiftCard}
                  disabled={sharingGiftCard}
                  isLoading={sharingGiftCard}
                  className="bg-bunny-primary hover:bg-bunny-primary-hover text-white font-semibold"
                >
                  🎁 Generar y compartir PNG
                </Button>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold text-bunny-text uppercase tracking-wider mb-2">Historial</h4>
                <div className="overflow-x-auto border border-bunny-border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bunny-paper/60 text-bunny-text-muted font-semibold border-b border-bunny-border uppercase tracking-wider">
                      <tr>
                        <th className="py-2 px-3">Fecha</th>
                        <th className="py-2 px-3">Evento</th>
                        <th className="py-2 px-3">Actor</th>
                        <th className="py-2 px-3">Nota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bunny-border/30">
                      {(currentGiftCard.events || []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-3 px-3 text-center text-bunny-text-muted">
                            Sin eventos registrados
                          </td>
                        </tr>
                      ) : (
                        (currentGiftCard.events || []).map((event) => (
                          <tr key={event.id} className="hover:bg-bunny-paper/30">
                            <td className="py-2 px-3 font-mono">{new Date(event.createdAt).toLocaleString('es-CL')}</td>
                            <td className="py-2 px-3 font-semibold">{event.eventType}</td>
                            <td className="py-2 px-3">{event.actorUsername || event.actor}</td>
                            <td className="py-2 px-3">{event.note || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Modal para Buscar o Asignar Clienta */}
      <Modal
        show={showAssignModal}
        onHide={() => setShowAssignModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Asignar Clienta a GiftCard {currentGiftCard?.code}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-900 text-xs">
            Para registrar los servicios canjeados en el historial, puntos/sellos de fidelidad y ficha de cliente, vincula esta GiftCard a una clienta existente o regístrala como clienta regular nueva.
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-bunny-text uppercase tracking-wider">
              Buscar Clienta Existente
            </h4>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowNewCustomerModal(true)}
            >
              ➕ Crear Nueva Clienta Regular
            </Button>
          </div>

          <input
            type="text"
            placeholder="Buscar por nombre, teléfono (+569...) o RUT"
            value={assignSearch}
            onChange={(e) => setAssignSearch(e.target.value)}
            className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
          />

          <div className="max-h-72 overflow-y-auto border border-bunny-border rounded-xl">
            {assignSearchResults.length === 0 ? (
              <p className="text-bunny-text-muted text-center py-6 text-sm">
                No se encontraron clientas coincidentes.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-bunny-paper/60 text-xs text-bunny-text-muted font-semibold border-b border-bunny-border uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Nombre</th>
                    <th className="py-2.5 px-3">Teléfono</th>
                    <th className="py-2.5 px-3">RUT</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bunny-border/30">
                  {assignSearchResults.map((cust) => (
                    <tr key={cust.id} className="hover:bg-bunny-paper/30">
                      <td className="py-2.5 px-3 font-semibold text-bunny-text">{cust.fullName}</td>
                      <td className="py-2.5 px-3">{cust.phone}</td>
                      <td className="py-2.5 px-3 font-mono text-xs">{cust.rut || '-'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          size="sm"
                          variant="success"
                          disabled={assignLoading}
                          onClick={() => handleBindCustomerToGiftCard(cust)}
                        >
                          {assignLoading ? 'Asignando...' : 'Asignar a GiftCard'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
