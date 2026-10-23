import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { giftcardsApi } from '@/api/giftcards.api';
import { GiftCard } from '@/types/giftcard.types';
import { useToast } from '@/hooks/useToast';
import { isBlankGiftCardBeneficiary } from '@/utils/giftcardRenderer';
import { normalizeRut } from '@/utils/rutUtils';
import { Card, Button, Input, Alert, Badge, Spinner } from '@/components/ui';
import { FiGift, FiCalendar, FiUser, FiCheckCircle } from 'react-icons/fi';

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
  const [submitting, setSubmitting] = useState(false);

  const loadGiftCard = async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const data = await giftcardsApi.getPublicByCode(code);
      setGiftCard(data);
    } catch {
      setError('No se pudo cargar la GiftCard. Verifica que el enlace sea correcto.');
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
      ? `[Canje al portador - Cliente: ${clientName.trim()} | Tel: ${clientPhone.trim()} | RUT: ${
          clientRut.trim() ? normalizeRut(clientRut) : 'N/A'
        }] ${note.trim()}`
      : note.trim();

    try {
      setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };

  const isBlankCard = giftCard
    ? isBlankGiftCardBeneficiary(giftCard.beneficiaryName) ||
      !giftCard.beneficiaryCustomerId ||
      giftCard.beneficiaryPhone === '+56900000000'
    : false;

  return (
    <div className="min-h-screen min-h-[100dvh] py-8 px-4 bg-gradient-to-b from-bunny-bg to-bunny-blush/40 flex flex-col justify-center">
      <div className="w-full max-w-3xl mx-auto">
        {/* Encabezado BunnyCure */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-bunny border-2 border-bunny-border-strong text-3xl mb-3">
            🐰
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-bunny-primary-dark tracking-tight">
            GiftCard BunnyCure
          </h1>
          <p className="text-sm text-bunny-text-muted mt-1">
            Consulta de saldo y canje de servicios en línea
          </p>
        </div>

        <Card className="shadow-bunny-lg border-bunny-border overflow-hidden">
          <Card.Body className="p-6 sm:p-8">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 text-bunny-text-muted">
                <Spinner size="lg" variant="primary" />
                <p className="text-sm mt-3">Cargando datos de la GiftCard...</p>
              </div>
            )}

            {error && (
              <Alert variant="danger" className="mb-6">
                {error}
              </Alert>
            )}

            {!loading && giftCard && (
              <div className="space-y-6">
                {/* Resumen de la GiftCard */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-bunny-paper/60 border border-bunny-border">
                  <div>
                    <span className="block text-xs font-semibold text-bunny-text-muted uppercase">
                      Código
                    </span>
                    <span className="text-base font-mono font-bold text-bunny-cocoa">
                      {giftCard.code}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-bunny-text-muted uppercase">
                      Estado
                    </span>
                    <Badge
                      variant={giftCard.status === 'ACTIVE' ? 'success' : 'neutral'}
                      className="mt-0.5"
                    >
                      {giftCard.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-bunny-text-muted uppercase">
                      Vencimiento
                    </span>
                    <span className="text-sm font-medium text-bunny-text flex items-center gap-1.5 mt-0.5">
                      <FiCalendar className="text-bunny-primary text-xs" /> {giftCard.expiresOn}
                    </span>
                  </div>
                </div>

                {/* Beneficiario */}
                <div className="p-3.5 rounded-xl border border-bunny-border/70 bg-white">
                  <span className="text-xs font-semibold text-bunny-text-muted uppercase block mb-1">
                    Beneficiaria
                  </span>
                  {isBlankCard ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-bunny-cocoa">
                        🎁 Tarjeta al Portador
                      </span>
                      <Badge variant="info">Sin destinatario fijo</Badge>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-bunny-cocoa flex items-center gap-1.5">
                      <FiUser className="text-bunny-primary text-sm" />
                      {giftCard.beneficiaryName} ({giftCard.beneficiaryPhone})
                    </span>
                  )}
                </div>

                {/* Servicios Incluidos */}
                <div>
                  <h2 className="text-base font-semibold text-bunny-cocoa mb-3 flex items-center gap-2">
                    <FiGift className="text-bunny-primary" /> Servicios Incluidos
                  </h2>

                  <div className="overflow-x-auto rounded-xl border border-bunny-border">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-bunny-paper border-b border-bunny-border text-xs font-semibold text-bunny-text-muted uppercase">
                          <th className="py-3 px-4">Servicio</th>
                          <th className="py-3 px-3 text-center">Total</th>
                          <th className="py-3 px-3 text-center">Disponible</th>
                          <th className="py-3 px-4 text-center">Cantidad a canjear</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bunny-border/60">
                        {giftCard.items.map((item) => (
                          <tr key={item.id} className="hover:bg-bunny-blush/20 transition-colors">
                            <td className="py-3 px-4 font-medium text-bunny-cocoa">
                              {item.serviceName}
                            </td>
                            <td className="py-3 px-3 text-center text-bunny-text-muted">
                              {item.quantity}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Badge variant={item.remainingQuantity > 0 ? 'success' : 'neutral'}>
                                {item.remainingQuantity}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
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
                                disabled={item.remainingQuantity <= 0}
                                className="w-20 rounded-lg border border-bunny-border px-2.5 py-1 text-center text-sm font-semibold text-bunny-cocoa focus:outline-none focus:ring-2 focus:ring-bunny-primary/30 disabled:bg-bunny-sand disabled:cursor-not-allowed"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Datos de quien canjea al portador */}
                {isBlankCard && (
                  <div className="p-4 rounded-xl border border-bunny-border bg-bunny-paper/40 space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-bunny-primary-dark">
                        📝 Datos de quien canjea la GiftCard
                      </h3>
                      <p className="text-xs text-bunny-text-muted mt-0.5">
                        Al ser una GiftCard al portador, requerimos tus datos para asociar el servicio a tu perfil de cliente BunnyCure.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="Nombre Completo *"
                        placeholder="Ej: Laura Pérez"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                      />
                      <Input
                        label="Teléfono *"
                        placeholder="Ej: +56912345678"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                      />
                      <Input
                        label="RUT"
                        placeholder="18.664.589-8"
                        value={clientRut}
                        onChange={(e) => setClientRut(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* PIN y Nota */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Input
                      type="password"
                      label="PIN de canje (6 dígitos) *"
                      placeholder="••••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      maxLength={6}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Nota / Observación"
                      placeholder="Ej: Canje en sucursal o para agendamiento"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                </div>

                {/* Botón de Canje */}
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto px-8"
                    onClick={handleRedeem}
                    isLoading={submitting}
                    loadingText="Canjeando..."
                    leftIcon={<FiCheckCircle />}
                  >
                    Canjear GiftCard
                  </Button>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
