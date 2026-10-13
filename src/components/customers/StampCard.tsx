import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Plus, Minus, Gift, QrCode, Share2, Copy, Check, Eye } from 'lucide-react';
import { useLoyaltyStore } from '../../stores/loyaltyStore';
import { customersApi } from '../../api/customers.api';
import { useToast } from '../../hooks/useToast';
import { QRCodeSVG } from 'qrcode.react';
import { Card, Alert, Badge, Button, Modal } from '../ui';
import { copyToClipboard, openWhatsApp, shareNative } from '../../utils/shareUtils';
import { normalizeLoyaltyCardPublicUrl, buildLoyaltyCardWhatsAppMessage } from '../../utils/loyaltyUrl';

interface StampCardProps {
  customerId?: number;
  publicId?: string;
  customerName?: string;
  customerPhone?: string;
  loyaltyStamps?: number;
  totalCompletedVisits?: number;
  currentRewardIndex?: number;
  onAdjust?: (delta: number) => void;
}

export default function StampCard({
  customerId,
  publicId,
  customerName = '',
  customerPhone = '',
  loyaltyStamps = 0,
  totalCompletedVisits = 0,
  currentRewardIndex = 0,
  onAdjust,
}: StampCardProps) {
  const { rewards, fetchRewards } = useLoyaltyStore();
  const toast = useToast();
  const navigate = useNavigate();
  const maxStamps = 10;

  const [walletUrl, setWalletUrl] = useState<string>('');
  const [showPassModal, setShowPassModal] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [sharingCard, setSharingCard] = useState(false);

  const effectivePublicId = publicId || (customerId ? String(customerId) : '');
  // URL pública oficial universal (apunta siempre a https://app.bunnycure.cl/mi-tarjeta/:publicId)
  const passUrl = normalizeLoyaltyCardPublicUrl(effectivePublicId);

  const canShareNatively = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyPassLink = async () => {
    if (!effectivePublicId) {
      toast.error('Identificador de tarjeta no disponible');
      return;
    }
    const ok = await copyToClipboard(passUrl);
    if (ok) {
      setCopiedPass(true);
      toast.success('¡Enlace de tarjeta copiado!');
      setTimeout(() => setCopiedPass(false), 2500);
    } else {
      toast.error('No se pudo copiar el enlace al portapapeles');
    }
  };

  const handleSendWhatsAppFallback = () => {
    if (!effectivePublicId) {
      toast.error('Identificador de tarjeta no disponible');
      return;
    }
    const message = buildLoyaltyCardWhatsAppMessage(customerName, loyaltyStamps, effectivePublicId);
    openWhatsApp(customerPhone, message);
    toast.info('Abriendo WhatsApp...');
  };

  const handleShareCard = async () => {
    if (!effectivePublicId) {
      toast.error('Identificador de tarjeta no disponible');
      return;
    }
    const message = buildLoyaltyCardWhatsAppMessage(customerName, loyaltyStamps, effectivePublicId);

    if (canShareNatively) {
      setSharingCard(true);
      try {
        const shared = await shareNative({
          title: `Bunny Pass - ${customerName || 'Clienta'}`,
          text: message,
          url: passUrl,
        });
        if (shared) {
          toast.success('Tarjeta compartida');
          return;
        }
      } finally {
        setSharingCard(false);
      }
    }

    // Fallback si no es compatible con Web Share nativo:
    if (customerPhone) {
      handleSendWhatsAppFallback();
    } else {
      handleCopyPassLink();
    }
  };

  const handleOpenCard = () => {
    if (!effectivePublicId) return;
    setShowPassModal(false);
    navigate(`/mi-tarjeta/${effectivePublicId}`);
  };

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  useEffect(() => {
    setWalletUrl('');
  }, [loyaltyStamps, currentRewardIndex]);

  const fetchWalletLinks = async (id: number) => {
    const links = await customersApi.getGoogleWalletLinks(id);
    setWalletUrl(links.openUrl);
    return links;
  };

  const handleAddToGoogleWallet = async () => {
    if (!customerId) return;
    try {
      const url = walletUrl || (await fetchWalletLinks(customerId)).openUrl;
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.error('No se pudo generar el enlace de Google Wallet');
      }
    } catch (error) {
      console.error('Error getting Google Wallet link:', error);
      toast.error('Error al conectar con Google Wallet');
    }
  };

  const currentStamps = loyaltyStamps >= maxStamps ? maxStamps : loyaltyStamps;
  const isRewardAvailable = loyaltyStamps >= maxStamps;

  const currentReward =
    rewards.length > 0 ? rewards[currentRewardIndex % rewards.length] : null;

  return (
    <Card className="mb-6 shadow-bunny border-bunny-border overflow-hidden">
      <div className="bg-bunny-paper border-b border-bunny-border px-5 py-3.5 flex justify-between items-center">
        <h3 className="text-base font-bold text-bunny-cocoa flex items-center gap-2 m-0">
          <Award className="w-5 h-5 text-bunny-primary" />
          Tarjeta de Fidelización
        </h3>
        <Badge variant="neutral">
          Visitas: {totalCompletedVisits}
        </Badge>
      </div>

      <Card.Body className="p-5 text-center space-y-4">
        {isRewardAvailable ? (
          <Alert variant="success">
            <div className="flex flex-col items-center gap-2 py-1 text-center w-full">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                <Gift className="w-6 h-6" />
                <span>¡Recompensa Lista!</span>
              </div>
              <p className="text-xs text-emerald-900 m-0">
                Este cliente tiene 10 sellos. Su próxima cita es de beneficio:
              </p>
              <Badge variant="success" className="text-sm py-1 px-3 mt-1">
                🎁 Premio: {currentReward?.name || 'Cargando...'}
              </Badge>
            </div>
          </Alert>
        ) : (
          <div className="p-3.5 bg-bunny-paper/50 rounded-xl border border-bunny-border flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2 text-bunny-primary text-xs font-bold uppercase tracking-wider">
              <Gift className="w-4 h-4" />
              Siguiente objetivo:
            </div>
            <span className="text-base font-bold text-bunny-cocoa">
              {currentReward?.name || 'Premio BunnyCure'}
            </span>
          </div>
        )}

        {/* Contador de Sellos */}
        <div className="flex justify-center items-center gap-4 py-2">
          <div className="text-center">
            <div className="text-3xl font-extrabold text-bunny-primary-dark">{currentStamps}</div>
            <div className="text-[11px] font-semibold text-bunny-text-muted uppercase tracking-wider">
              Sellos
            </div>
          </div>
          <div className="text-2xl text-bunny-border-strong font-light">/</div>
          <div className="text-center">
            <div className="text-3xl font-extrabold text-bunny-text-muted">{maxStamps}</div>
            <div className="text-[11px] font-semibold text-bunny-text-muted uppercase tracking-wider">
              Meta
            </div>
          </div>

          {onAdjust && (
            <div className="ml-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => onAdjust(-1)}
                disabled={loyaltyStamps <= 0}
                title="Quitar un sello manualmente"
                className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onAdjust(1)}
                title="Agregar un sello manualmente"
                className="p-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Grilla de Sellos (Círculos) */}
        <div className="flex flex-wrap justify-center gap-3 py-2">
          {Array.from({ length: maxStamps }).map((_, index) => {
            const isFilled = index < currentStamps;
            return (
              <div
                key={index}
                className={`flex items-center justify-center rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-bunny-primary text-white shadow-bunny scale-105'
                    : 'bg-bunny-paper/80 text-bunny-text-muted border border-bunny-border'
                }`}
                style={{ width: '50px', height: '50px' }}
              >
                {isFilled ? (
                  <Award className="w-6 h-6" />
                ) : (
                  <span className="text-xs font-bold text-bunny-cocoa/50">{index + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-bunny-border/60">
          <p className="text-xs text-bunny-text-muted text-left mb-3">
            <strong>Lógica del programa:</strong> Las visitas 1 a 10 acumulan sellos. La visita #11 es de premio.
          </p>

          {customerId && (
            <div className="flex flex-wrap justify-center items-center gap-2.5">
              {effectivePublicId && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleShareCard}
                    disabled={sharingCard}
                    leftIcon={<Share2 className="w-4 h-4" />}
                    className="h-10 rounded-full px-4 bg-bunny-primary hover:bg-bunny-primary-hover text-white shadow-xs font-semibold"
                  >
                    {sharingCard ? 'Compartiendo...' : 'Compartir Tarjeta'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPassModal(true)}
                    leftIcon={<QrCode className="w-4 h-4 text-bunny-primary" />}
                    className="h-10 rounded-full px-4 font-semibold text-bunny-cocoa hover:text-bunny-primary"
                  >
                    Ver Código QR
                  </Button>
                </>
              )}

              <button
                type="button"
                onClick={handleAddToGoogleWallet}
                className="border-0 bg-transparent p-0 transition-transform hover:scale-105 cursor-pointer"
                title="Añadir a Google Wallet"
              >
                <img
                  src="/save-to-google-wallet.svg"
                  alt="Save to Google Wallet"
                  className="h-10"
                />
              </button>
            </div>
          )}
        </div>

        {/* Modal para Tarjeta Digital Bunny Pass / Código QR */}
        <Modal show={showPassModal} onHide={() => setShowPassModal(false)} size="sm" centered>
          <Modal.Header closeButton>
            <Modal.Title className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-bunny-primary" />
              Código QR - Bunny Pass
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center py-4 space-y-4">
            <p className="text-xs text-bunny-text-muted mb-2">
              La clienta puede escanear este código con su teléfono para abrir o guardar su tarjeta digital.
            </p>

            {effectivePublicId && (
              <div className="bg-white p-3 inline-block rounded-2xl border border-bunny-border shadow-xs">
                <QRCodeSVG
                  value={passUrl}
                  size={190}
                  level="M"
                  includeMargin={false}
                />
              </div>
            )}

            {effectivePublicId && (
              <div className="mt-2 text-left">
                <label className="text-[11px] font-semibold text-bunny-text-muted block mb-1">
                  Enlace directo oficial:
                </label>
                <div className="flex items-center gap-1 bg-[#FDFCF8] border border-bunny-border rounded-xl px-2.5 py-1.5">
                  <input
                    type="text"
                    readOnly
                    value={passUrl}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-transparent text-[11px] font-mono text-bunny-cocoa border-0 outline-hidden select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPassLink}
                    className="text-bunny-primary hover:text-bunny-primary-hover p-1 cursor-pointer"
                    title="Copiar"
                  >
                    {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCard}
                leftIcon={<Eye className="w-4 h-4 text-bunny-primary" />}
                className="w-full justify-center"
              >
                Ver Tarjeta en Pantalla Completa
              </Button>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline" size="sm" onClick={() => setShowPassModal(false)} fullWidth>
              Cerrar
            </Button>
          </Modal.Footer>
        </Modal>
      </Card.Body>
    </Card>
  );
}
