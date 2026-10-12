import { useEffect, useState } from 'react';
import { Award, Plus, Minus, Gift, QrCode } from 'lucide-react';
import { useLoyaltyStore } from '../../stores/loyaltyStore';
import { customersApi } from '../../api/customers.api';
import { useToast } from '../../hooks/useToast';
import { QRCodeSVG } from 'qrcode.react';
import { Card, Alert, Badge, Button, Modal } from '../ui';

interface StampCardProps {
  customerId?: number;
  loyaltyStamps?: number;
  totalCompletedVisits?: number;
  currentRewardIndex?: number;
  onAdjust?: (delta: number) => void;
}

export default function StampCard({
  customerId,
  loyaltyStamps = 0,
  totalCompletedVisits = 0,
  currentRewardIndex = 0,
  onAdjust,
}: StampCardProps) {
  const { rewards, fetchRewards } = useLoyaltyStore();
  const toast = useToast();
  const maxStamps = 10;

  const [walletUrl, setWalletUrl] = useState<string>('');
  const [walletQrUrl, setWalletQrUrl] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const [loadingQR, setLoadingQR] = useState(false);
  const walletUrlLikelyTooLongForQr = walletQrUrl.length > 2900;

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
            <div className="flex justify-center items-center gap-2.5">
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
                {loadingQR ? 'Cargando...' : 'Ver QR'}
              </Button>
            </div>
          )}
        </div>

        {/* Modal para el Código QR */}
        <Modal show={showQR} onHide={() => setShowQR(false)} size="sm" centered>
          <Modal.Header closeButton>
            <Modal.Title>Escanea para descargar</Modal.Title>
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
