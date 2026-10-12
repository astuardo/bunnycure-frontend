import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Plus, Minus, Gift, QrCode, Smartphone, Share2, ExternalLink, Copy, Check, Eye } from 'lucide-react';
import { useLoyaltyStore } from '../../stores/loyaltyStore';
import { customersApi } from '../../api/customers.api';
import { useToast } from '../../hooks/useToast';
import { QRCodeSVG } from 'qrcode.react';
import { Card, Alert, Badge, Button, Modal } from '../ui';
import { copyToClipboard, openWhatsApp, openExternalUrl, shareNative } from '../../utils/shareUtils';

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
  const [walletQrUrl, setWalletQrUrl] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const [loadingQR, setLoadingQR] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const walletUrlLikelyTooLongForQr = walletQrUrl.length > 2900;

  const effectivePublicId = publicId || (customerId ? String(customerId) : '');
  const passUrl = effectivePublicId
    ? `${window.location.origin}/mi-tarjeta/${effectivePublicId}`
    : '';

  const canShareNatively = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyPassLink = async () => {
    if (!passUrl) {
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

  const handleSendWhatsApp = () => {
    if (!passUrl) {
      toast.error('Identificador de tarjeta no disponible');
      return;
    }
    const name = customerName ? customerName.split(' ')[0] : 'Clienta';
    const message = `¡Hola ${name}! 💅 Aquí tienes tu Tarjeta Digital BunnyCure Pass con tus sellos actualizados (${loyaltyStamps}/10): ${passUrl}`;
    openWhatsApp(customerPhone, message);
  };

  const handleShareNative = async () => {
    if (!passUrl) {
      toast.error('Identificador de tarjeta no disponible');
      return;
    }
    const name = customerName ? customerName.split(' ')[0] : 'Clienta';
    const message = `¡Hola ${name}! 💅 Aquí tienes tu Tarjeta Digital BunnyCure Pass: ${passUrl}`;
    const shared = await shareNative({
      title: 'Bunny Pass Club',
      text: message,
      url: passUrl,
    });
    if (!shared) {
      handleSendWhatsApp();
    }
  };

  const handleOpenCard = () => {
    if (!effectivePublicId) return;
    setShowPassModal(false);
    navigate(`/mi-tarjeta/${effectivePublicId}`);
  };

  const handleOpenBrowser = () => {
    if (!passUrl) return;
    openExternalUrl(passUrl);
  };

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  useEffect(() => {
    setWalletUrl('');
    setWalletQrUrl('');
  }, [loyaltyStamps, currentRewardIndex]);

  const fetchWalletLinks = async (id: number) => {
    const links = await customersApi.getGoogleWalletLinks(id);
    setWalletUrl(links.openUrl);
    setWalletQrUrl(links.qrUrl);
    return links;
  };

  const handleShowQR = async () => {
    if (!customerId) return;

    if (walletQrUrl) {
      setShowQR(true);
      return;
    }

    setLoadingQR(true);
    try {
      const links = await fetchWalletLinks(customerId);
      if (links.qrUrl) {
        setShowQR(true);
      } else {
        toast.error('No se pudo generar el enlace de Google Wallet');
      }
    } catch (error) {
      console.error('Error getting Google Wallet link:', error);
      toast.error('Error al conectar con Google Wallet');
    } finally {
      setLoadingQR(false);
    }
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
              {publicId && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowPassModal(true)}
                  leftIcon={<Smartphone className="w-4 h-4" />}
                  className="h-10 rounded-full px-4 bg-bunny-primary hover:bg-bunny-primary-hover text-white shadow-xs"
                >
                  Tarjeta Digital (PWA)
                </Button>
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

              <Button
                variant="outline"
                size="sm"
                onClick={handleShowQR}
                disabled={loadingQR}
                leftIcon={<QrCode className="w-4 h-4" />}
                className="h-10 rounded-full px-4"
              >
                {loadingQR ? 'Cargando...' : 'Ver QR Google'}
              </Button>
            </div>
          )}
        </div>

        {/* Modal para Tarjeta Digital PWA Pass */}
        <Modal show={showPassModal} onHide={() => setShowPassModal(false)} size="sm" centered>
          <Modal.Header closeButton>
            <Modal.Title className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-bunny-primary" />
              Tarjeta Digital BunnyCure
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center py-4 space-y-4">
            <p className="text-xs text-bunny-text-muted mb-2">
              Compatible con iPhone (Safari / Pantalla de inicio) y Android.
            </p>

            {passUrl && (
              <div className="bg-white p-3 inline-block rounded-2xl border border-bunny-border shadow-xs">
                <QRCodeSVG
                  value={passUrl}
                  size={190}
                  level="M"
                  includeMargin={false}
                />
              </div>
            )}

            {passUrl && (
              <div className="mt-2 text-left">
                <label className="text-[11px] font-semibold text-bunny-text-muted block mb-1">
                  Enlace directo de la clienta:
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
                    className="text-bunny-primary hover:text-bunny-primary-hover p-1"
                    title="Copiar"
                  >
                    {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              {/* Opción 1: Menú nativo Compartir (si el dispositivo lo soporta) */}
              {canShareNatively && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleShareNative}
                  leftIcon={<Share2 className="w-4 h-4" />}
                  className="w-full justify-center bg-bunny-primary hover:bg-bunny-primary-hover text-white"
                >
                  Compartir (WhatsApp / AirDrop)
                </Button>
              )}

              {/* Opción 2: Enviar directo por WhatsApp */}
              <Button
                variant={canShareNatively ? 'outline' : 'primary'}
                size="sm"
                onClick={handleSendWhatsApp}
                leftIcon={<Share2 className="w-4 h-4 text-emerald-600" />}
                className={`w-full justify-center ${!canShareNatively ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
              >
                Enviar por WhatsApp
              </Button>

              {/* Opción 3: Copiar enlace */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPassLink}
                leftIcon={copiedPass ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                className="w-full justify-center"
              >
                {copiedPass ? '¡Enlace Copiado!' : 'Copiar Enlace de Tarjeta'}
              </Button>

              {/* Opción 4: Ver tarjeta directamente en la app */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenCard}
                leftIcon={<Eye className="w-4 h-4 text-bunny-primary" />}
                className="w-full justify-center"
              >
                Ver Tarjeta en Pantalla Completa
              </Button>

              {/* Opción 5: Abrir en navegador externo */}
              {passUrl && (
                <button
                  type="button"
                  onClick={handleOpenBrowser}
                  className="inline-flex items-center justify-center gap-1.5 text-xs text-bunny-primary hover:underline font-semibold pt-1 border-0 bg-transparent cursor-pointer"
                >
                  Abrir Tarjeta en navegador <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline" size="sm" onClick={() => setShowPassModal(false)} fullWidth>
              Cerrar
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal para el Código QR de Google Wallet */}
        <Modal show={showQR} onHide={() => setShowQR(false)} size="sm" centered>
          <Modal.Header closeButton>
            <Modal.Title>Escanea para Google Wallet</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center py-4">
            {walletQrUrl &&
              (walletUrlLikelyTooLongForQr ? (
                <Alert variant="warning" className="text-left mb-3">
                  El enlace es demasiado largo para generar un QR escaneable. Usa el botón de Google Wallet.
                </Alert>
              ) : (
                <div className="bg-white p-3 inline-block rounded-xl border border-bunny-border shadow-xs">
                  <QRCodeSVG
                    value={walletQrUrl}
                    size={200}
                    level="L"
                    includeMargin={true}
                  />
                </div>
              ))}
            <p className="mt-3 mb-0 text-xs text-bunny-text-muted">
              Pide a la clienta que escanee este código para guardar su pase BunnyCure en Google Wallet.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline" size="sm" onClick={() => setShowQR(false)} fullWidth>
              Cerrar
            </Button>
          </Modal.Footer>
        </Modal>
      </Card.Body>
    </Card>
  );
}
