import { useEffect, useState } from 'react';
import { Card, Alert, Badge, Button, ButtonGroup, Modal } from 'react-bootstrap';
import { Award, Plus, Minus, Gift, QrCode } from 'lucide-react';
import { useLoyaltyStore } from '../../stores/loyaltyStore';
import { customersApi } from '../../api/customers.api';
import { useToast } from '../../hooks/useToast';
import { QRCodeSVG } from 'qrcode.react';

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
  onAdjust 
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
  
  // Calculate how many stamps to show on the current card
  const currentStamps = loyaltyStamps >= maxStamps ? maxStamps : loyaltyStamps;
    
  const isRewardAvailable = loyaltyStamps >= maxStamps;

  // Get current target reward
  const currentReward = rewards.length > 0 
    ? rewards[currentRewardIndex % rewards.length]
    : null;

  return (
    <Card className="mb-4 shadow-sm border-0">
      <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center py-3">
        <h5 className="mb-0 d-flex align-items-center gap-2 text-white">
          <Award size={20} />
          Tarjeta de Fidelización
        </h5>
        <Badge bg="light" text="dark" className="rounded-pill px-3">
          Visitas: {totalCompletedVisits}
        </Badge>
      </Card.Header>
      <Card.Body className="text-center">
        {isRewardAvailable ? (
          <Alert variant="success" className="d-flex flex-column align-items-center gap-2 mb-4 py-3 border-0 shadow-sm">
            <div className="d-flex align-items-center gap-2">
              <Gift size={24} />
              <strong className="fs-5">¡Recompensa Lista!</strong>
            </div>
            <p className="mb-0">Este cliente tiene 10 sellos. Su próxima cita es de beneficio:</p>
            <Badge bg="success" className="fs-6 mt-1 p-2">
              🎁 Premio: {currentReward?.name || 'Cargando...'}
            </Badge>
          </Alert>
        ) : (
          <div className="mb-4 p-3 bg-light rounded-3 d-flex flex-column align-items-center gap-2">
             <div className="d-flex align-items-center gap-2 text-primary fw-bold">
               <Gift size={18} />
               Siguiente objetivo:
             </div>
             <span className="fs-5 fw-bold text-dark">
               {currentReward?.name || 'Premio BunnyCure'}
             </span>
          </div>
        )}
        
        <div className="d-flex justify-content-center align-items-center gap-4 mb-4 mt-2">
          <div className="text-center">
             <div className="fs-3 fw-bold text-primary">{currentStamps}</div>
             <div className="small text-muted text-uppercase tracking-wider">Sellos</div>
          </div>
          <div className="fs-2 text-light-emphasis">/</div>
          <div className="text-center">
             <div className="fs-3 fw-bold text-muted">{maxStamps}</div>
             <div className="small text-muted text-uppercase tracking-wider">Meta</div>
          </div>
          
          {onAdjust && (
            <div className="ms-3">
              <ButtonGroup size="sm">
                <Button 
                  variant="outline-danger" 
                  onClick={() => onAdjust(-1)}
                  disabled={loyaltyStamps <= 0}
                  title="Quitar un sello manualmente"
                >
                  <Minus size={16} />
                </Button>
                <Button 
                  variant="outline-success" 
                  onClick={() => onAdjust(1)}
                  title="Agregar un sello manualmente"
                >
                  <Plus size={16} />
                </Button>
              </ButtonGroup>
            </div>
          )}
        </div>

        <div className="d-flex flex-wrap justify-content-center gap-3 mb-2">
          {Array.from({ length: maxStamps }).map((_, index) => {
            const isFilled = index < currentStamps;
            return (
              <div 
                key={index} 
                className={`d-flex align-items-center justify-content-center rounded-circle ${
                  isFilled ? 'bg-primary text-white shadow-sm' : 'bg-light text-muted border border-2'
                }`}
                style={{ 
                  width: '52px', 
                  height: '52px',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transform: isFilled ? 'scale(1.1)' : 'scale(1)'
                }}
              >
                {isFilled ? <Award size={26} /> : <span className="small fw-bold">{index + 1}</span>}
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-3 border-top">
          <p className="text-muted small mb-3 text-start">
            <strong>Lógica del programa:</strong> Las visitas 1 a 10 acumulan sellos. 
            La visita #11 es de premio.
          </p>
          {customerId && (
            <div className="d-flex flex-column align-items-center gap-3">
              <div className="d-flex justify-content-center align-items-center gap-2 w-100">
                <button 
                  onClick={handleAddToGoogleWallet}
                  className="border-0 bg-transparent p-0"
                  title="Añadir a Google Wallet"
                  style={{ transition: 'transform 0.2s', cursor: 'pointer' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <img 
                    src="/save-to-google-wallet.svg" 
                    alt="Save to Google Wallet"
                    style={{ height: '44px' }}
                  />
                </button>

                <Button 
                  variant="outline-primary" 
                  className="d-flex align-items-center gap-2"
                  onClick={handleShowQR}
                  disabled={loadingQR}
                  style={{ height: '44px', borderRadius: '22px' }}
                >
                  <QrCode size={20} />
                  {loadingQR ? 'Cargando...' : 'Ver QR'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal para el Código QR */}
        <Modal show={showQR} onHide={() => setShowQR(false)} centered size="sm">
          <Modal.Header closeButton>
            <Modal.Title className="fs-6">Escanea para descargar</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center py-4">
            {walletQrUrl && (
              walletUrlLikelyTooLongForQr ? (
                <Alert variant="warning" className="mb-3 text-start">
                  El enlace es demasiado largo para generar un QR escaneable. Usa el bot&oacute;n de Google Wallet.
                </Alert>
              ) : (
                <div className="bg-white p-3 d-inline-block rounded shadow-sm">
                  <QRCodeSVG 
                    value={walletQrUrl}
                    size={200}
                    level="L"
                    includeMargin={true}
                  />
                </div>
              )
            )}
            <p className="mt-3 mb-0 small text-muted">
              Pide a la clienta que escanee este código para guardar su pase BunnyCure (formato Generic) en Google Wallet.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowQR(false)} className="w-100">
              Cerrar
            </Button>
          </Modal.Footer>
        </Modal>
      </Card.Body>
    </Card>
  );
}
