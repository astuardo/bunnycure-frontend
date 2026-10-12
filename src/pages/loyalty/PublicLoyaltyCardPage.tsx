import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Sparkles,
  Gift,
  Share2,
  Calendar,
  Smartphone,
  Copy,
  Check,
  Heart,
  ChevronRight,
  Info,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { loyaltyCardApi } from '@/api/loyaltyCard.api';
import { LoyaltyCardPublicDto } from '@/types/loyaltyCard.types';
import { useToast } from '@/hooks/useToast';
import { copyToClipboard, openWhatsApp, shareNative } from '@/utils/shareUtils';

export default function PublicLoyaltyCardPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const toast = useToast();

  const [card, setCard] = useState<LoyaltyCardPublicDto | null>(() => {
    if (!publicId) return null;
    const cached = localStorage.getItem(`bunny_loyalty_${publicId}`);
    return cached ? JSON.parse(cached) : null;
  });

  const [loading, setLoading] = useState<boolean>(!card);
  const [error, setError] = useState<string | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchCard = async (isRefresh = false) => {
    if (!publicId) {
      setError('Identificador de tarjeta no válido.');
      setLoading(false);
      return;
    }

    if (!isRefresh && !card) setLoading(true);
    setError(null);

    try {
      const data = await loyaltyCardApi.getPublicCard(publicId);
      setCard(data);
      localStorage.setItem(`bunny_loyalty_${publicId}`, JSON.stringify(data));
      if (isRefresh) {
        toast.success('Sellos actualizados');
      }
    } catch (err) {
      console.error('Error fetching loyalty card:', err);
      if (!card) {
        setError('No pudimos encontrar esta tarjeta. Verifica el enlace o consulta con BunnyCure.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId]);

  const handleCopyLink = async () => {
    const url = window.location.href;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast.success('¡Enlace de tarjeta copiado!');
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const handleShareWhatsApp = () => {
    if (!card) return;
    const text = `¡Hola! Esta es mi Tarjeta de Fidelización BunnyCure Club (${card.loyaltyStamps}/10 sellos acumulados 💅): ${window.location.href}`;
    openWhatsApp(undefined, text);
  };

  const handleShareNative = async () => {
    if (!card) return;
    const text = `¡Hola! Esta es mi Tarjeta de Fidelización BunnyCure Club (${card.loyaltyStamps}/10 sellos acumulados 💅)`;
    const shared = await shareNative({
      title: 'Bunny Pass Club',
      text,
      url: window.location.href,
    });
    if (!shared) {
      handleShareWhatsApp();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-full border-4 border-[#F0E0D8] border-t-[#C9897A] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-[#C9897A]">
            <Heart className="w-6 h-6 fill-[#C9897A] animate-pulse" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-[#5C3D2E]">Cargando tu Bunny Pass...</h2>
        <p className="text-sm text-[#9E7B6E] mt-1">Conectando con el salón</p>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#FDF0EC] flex items-center justify-center text-[#BE4D4D] mb-4">
          <Info className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#5C3D2E] mb-2">Tarjeta no encontrada</h2>
        <p className="text-sm text-[#9E7B6E] max-w-sm mb-6">
          {error || 'El identificador de tarjeta es inválido o no existe en nuestros registros.'}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => fetchCard(true)}
            className="w-full py-3 px-4 rounded-xl bg-[#C9897A] text-white font-medium hover:bg-[#B77768] transition-colors"
          >
            Reintentar
          </button>
          <a
            href="https://wa.me/56927978078"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl border border-[#F0E0D8] text-[#5C3D2E] font-medium hover:bg-[#FDF0EC] transition-colors"
          >
            Contactar por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const stampsArray = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-[#F7F4F0] text-[#5C3D2E] pb-12 antialiased selection:bg-[#FDF0EC]">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-[#F0E0D8]/60 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4B856E] animate-pulse" />
            <span className="text-xs font-semibold tracking-wider text-[#9E7B6E] uppercase">
              BunnyCure Club Pass
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchCard(true)}
              className="p-2 rounded-full hover:bg-[#FDF0EC] text-[#9E7B6E] transition-colors"
              title="Actualizar sellos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-full hover:bg-[#FDF0EC] text-[#9E7B6E] transition-colors"
              title="Copiar enlace"
            >
              {copied ? <Check className="w-4 h-4 text-[#4B856E]" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleShareNative}
              className="p-2 rounded-full hover:bg-[#FDF0EC] text-[#9E7B6E] transition-colors"
              title="Compartir tarjeta"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Apple Wallet Style Digital Card */}
        <div className="relative rounded-3xl p-6 shadow-2xl overflow-hidden bg-gradient-to-br from-[#6A3225] via-[#8F4738] to-[#C9897A] text-white border border-white/20">
          {/* Glass reflection highlight */}
          <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {/* Card Top: Branding & Status Badge */}
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-1.5 text-rose-200">
                <Sparkles className="w-4 h-4" />
                <span className="text-[11px] font-bold tracking-widest uppercase">
                  BunnyCure Nail Studio
                </span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight mt-0.5">
                BUNNY PASS
              </h1>
            </div>

            {card.rewardAvailable ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#E6993A] text-white shadow-lg animate-bounce">
                <Gift className="w-3.5 h-3.5" />
                ¡PREMIO LISTO!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/15 backdrop-blur-md text-rose-100 border border-white/10">
                <Heart className="w-3 h-3 fill-rose-300" />
                Miembro VIP
              </span>
            )}
          </div>

          {/* Customer Info */}
          <div className="mt-5 relative z-10">
            <p className="text-[11px] uppercase tracking-wider text-rose-200 font-medium">Titular</p>
            <p className="text-xl font-bold tracking-tight text-white">{card.customerName}</p>
            <p className="text-xs text-rose-200/80 mt-0.5">{card.phone}</p>
          </div>

          {/* 10-Stamp Grid (2 rows of 5) */}
          <div className="mt-6 pt-5 border-t border-white/15 relative z-10">
            <div className="flex items-center justify-between text-xs text-rose-200 mb-3">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Progreso de Sellos
              </span>
              <span className="font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
                {card.loyaltyStamps} de {card.maxStamps}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {stampsArray.map((slotNumber) => {
                const isStamped = slotNumber <= card.loyaltyStamps;
                const isNext = slotNumber === card.loyaltyStamps + 1;
                const isTenth = slotNumber === 10;

                return (
                  <div
                    key={slotNumber}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-300 relative ${
                      isStamped
                        ? 'bg-white text-[#7C3A2D] shadow-md shadow-black/20 scale-100 ring-2 ring-white/50'
                        : isNext
                        ? 'bg-white/20 border-2 border-dashed border-white text-white animate-pulse'
                        : 'bg-white/10 text-white/40 border border-white/10'
                    }`}
                  >
                    {isStamped ? (
                      isTenth ? (
                        <div className="flex flex-col items-center">
                          <Gift className="w-5 h-5 text-[#E6993A] animate-bounce" />
                          <span className="text-[8px] font-black text-[#E6993A] tracking-tighter">GRATIS</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Sparkles className="w-4 h-4 text-[#C9897A]" />
                          <CheckCircle2 className="w-3 h-3 text-[#4B856E] mt-0.5" />
                        </div>
                      )
                    ) : (
                      <>
                        {isTenth ? (
                          <Gift className="w-4 h-4 text-white/50" />
                        ) : (
                          <span className="text-xs font-bold">{slotNumber}</span>
                        )}
                        <span className="text-[8px] text-white/50 tracking-tighter">
                          {isTenth ? 'PREMIO' : `#${slotNumber}`}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reward Message Box */}
          <div className="mt-5 p-3.5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 relative z-10">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-xl bg-white/20 text-white mt-0.5">
                <Gift className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs">
                <p className="font-semibold text-white">Premio: {card.currentRewardName}</p>
                <p className="text-rose-100 mt-0.5 leading-relaxed">{card.rewardStatusMessage}</p>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="mt-5 pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-rose-200 relative z-10">
            <span>Visitas registradas: {card.totalCompletedVisits}</span>
            <span className="font-mono text-[10px] text-white/60">
              ID: {card.publicId.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* QR Code Presentation Box */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#F0E0D8] text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF0EC] text-[#C9897A] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Escanear en el Salón
          </div>

          <div className="flex justify-center py-2">
            <div className="p-4 bg-white rounded-2xl shadow-inner border border-[#F0E0D8] inline-block">
              <QRCodeSVG
                value={card.qrValue}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#5C3D2E]">Código de Identificación</p>
            <p className="text-xs text-[#9E7B6E] mt-1 max-w-xs mx-auto">
              Presenta este código QR en recepción al finalizar tu manicura para sumar tu visita automáticamente.
            </p>
          </div>
        </div>

        {/* Action Buttons: Add to Home Screen (A2HS) + Google Wallet */}
        <div className="space-y-3">
          {/* iOS / Safari Add to Home Button */}
          <button
            onClick={() => setShowIosInstructions(true)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-[#F0E0D8] shadow-sm hover:border-[#C9897A] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FDF0EC] text-[#C9897A] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-[#5C3D2E]">Guardar en iPhone</p>
                <p className="text-xs text-[#9E7B6E]">Acceso directo en tu pantalla de inicio</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#9E7B6E] group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Google Wallet Button (If available) */}
          {card.googleWalletUrl && (
            <a
              href={card.googleWalletUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-[#F0E0D8] shadow-sm hover:border-[#C9897A] transition-all group"
            >
              <div className="flex items-center gap-3">
                <img
                  src="/save-to-google-wallet.svg"
                  alt="Google Wallet"
                  className="h-10 rounded-lg group-hover:scale-105 transition-transform"
                />
                <div className="text-left">
                  <p className="text-sm font-bold text-[#5C3D2E]">Añadir a Google Wallet</p>
                  <p className="text-xs text-[#9E7B6E]">Para usuarias con Android o app Wallet</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9E7B6E] group-hover:translate-x-0.5 transition-transform" />
            </a>
          )}

          {/* Book Appointment CTA */}
          <Link
            to="/reservar"
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-[#C9897A] text-white font-bold text-sm shadow-md shadow-[#C9897A]/20 hover:bg-[#B77768] transition-all"
          >
            <Calendar className="w-4 h-4" />
            Agendar mi próxima cita
          </Link>
        </div>

        {/* Salon Footer Info */}
        <div className="pt-6 border-t border-[#F0E0D8]/60 text-center text-xs text-[#9E7B6E] space-y-1">
          <p className="font-semibold text-[#5C3D2E]">BunnyCure Nail Studio</p>
          <p>Las visitas 1 a 10 acumulan sellos • La visita #11 es de premio especial</p>
          <p className="pt-2 text-[11px] text-[#9E7B6E]/80">
            Instagram: <a href="https://instagram.com/bunnycure.cl" target="_blank" rel="noreferrer" className="text-[#C9897A] hover:underline">@bunnycure.cl</a>
          </p>
        </div>
      </main>

      {/* Safari Add-to-Home Modal */}
      {showIosInstructions && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-[#F0E0D8] space-y-5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#FDF0EC] text-[#C9897A]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#5C3D2E]">Guardar en tu iPhone</h3>
              </div>
              <button
                onClick={() => setShowIosInstructions(false)}
                className="text-[#9E7B6E] hover:text-[#5C3D2E] text-sm font-semibold p-1"
              >
                Cerrar
              </button>
            </div>

            <p className="text-xs text-[#9E7B6E] leading-relaxed">
              Agrega tu tarjeta BunnyCure como una app a tu pantalla de inicio en solo 3 pasos:
            </p>

            <div className="space-y-3.5 text-xs text-[#5C3D2E]">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FDFCF8] border border-[#F0E0D8]">
                <span className="w-6 h-6 rounded-full bg-[#C9897A] text-white font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <p>
                  En <strong>Safari</strong>, presiona el botón <strong>Compartir</strong>{' '}
                  <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 font-mono text-[10px]">
                    (⎋)
                  </span>{' '}
                  en la barra inferior.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FDFCF8] border border-[#F0E0D8]">
                <span className="w-6 h-6 rounded-full bg-[#C9897A] text-white font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <p>
                  Baja en el menú y toca <strong>"Agregar a pantalla de inicio"</strong>{' '}
                  <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 font-mono text-[10px]">
                    (⊞)
                  </span>.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FDFCF8] border border-[#F0E0D8]">
                <span className="w-6 h-6 rounded-full bg-[#C9897A] text-white font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <p>
                  Presiona <strong>"Agregar"</strong> arriba a la derecha. ¡Tu tarjeta quedará guardada como una app lista para usar!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIosInstructions(false)}
              className="w-full py-3 rounded-2xl bg-[#C9897A] text-white font-bold text-xs hover:bg-[#B77768] transition-colors"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
