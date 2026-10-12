import { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '@/components/ui';
import { FaWhatsapp, FaCopy, FaCheck, FaUndo, FaMagic, FaRegClock } from 'react-icons/fa';
import { InactiveCustomer, TemplateTone } from '@/types/reactivation.types';
import {
  buildReactivationMessage,
  buildReactivationWhatsAppUrl,
  recordCustomerContact,
  BUNNYCURE_OFFICIAL_PHONE,
} from '@/utils/reactivationUtils';
import { useToast } from '@/hooks/useToast';

interface ReactivationMessageModalProps {
  show: boolean;
  onHide: () => void;
  inactiveItem: InactiveCustomer | null;
  onContactRecorded?: (customerId: number) => void;
}

export default function ReactivationMessageModal({
  show,
  onHide,
  inactiveItem,
  onContactRecorded,
}: ReactivationMessageModalProps) {
  const toast = useToast();
  const [tone, setTone] = useState<TemplateTone>('MAINTENANCE');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  // Seleccionar tono sugerido automáticamente según días de inactividad
  useEffect(() => {
    if (inactiveItem) {
      const days = inactiveItem.daysSinceLastAppointment;
      let initialTone: TemplateTone = 'MAINTENANCE';
      if (days >= 45) {
        initialTone = 'SPECIAL_OFFER';
      } else if (days >= 30) {
        initialTone = 'MISS_YOU';
      }
      setTone(initialTone);
      const generated = buildReactivationMessage({
        customer: inactiveItem.customer,
        lastServiceName: inactiveItem.lastServiceName,
        daysSinceLast: inactiveItem.daysSinceLastAppointment,
        tone: initialTone,
        businessPhone: BUNNYCURE_OFFICIAL_PHONE,
      });
      setMessageText(generated);
      setCopied(false);
    }
  }, [inactiveItem, show]);

  const handleToneChange = (newTone: TemplateTone) => {
    setTone(newTone);
    if (inactiveItem) {
      const generated = buildReactivationMessage({
        customer: inactiveItem.customer,
        lastServiceName: inactiveItem.lastServiceName,
        daysSinceLast: inactiveItem.daysSinceLastAppointment,
        tone: newTone,
        businessPhone: BUNNYCURE_OFFICIAL_PHONE,
      });
      setMessageText(generated);
    }
  };

  const handleResetToDefault = () => {
    if (inactiveItem) {
      const generated = buildReactivationMessage({
        customer: inactiveItem.customer,
        lastServiceName: inactiveItem.lastServiceName,
        daysSinceLast: inactiveItem.daysSinceLastAppointment,
        tone,
        businessPhone: BUNNYCURE_OFFICIAL_PHONE,
      });
      setMessageText(generated);
      toast.info('Texto restablecido a la plantilla');
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      toast.success('Mensaje copiado al portapapeles');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('No se pudo copiar el texto automáticamente');
    }
  };

  const handleSendWhatsApp = () => {
    if (!inactiveItem) return;

    // Registrar en anti-spam
    recordCustomerContact(inactiveItem.customer.id, inactiveItem.lastServiceName, 'WHATSAPP');
    onContactRecorded?.(inactiveItem.customer.id);

    // Abrir URL de WhatsApp
    const url = buildReactivationWhatsAppUrl(inactiveItem.customer.phone, messageText);
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success(`Abriendo WhatsApp para ${inactiveItem.customer.fullName}`);
    onHide();
  };

  if (!inactiveItem) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="flex items-center gap-2">
            <FaWhatsapp className="text-emerald-500 text-xl" />
            <span>
              Mensaje de Reactivación para <strong className="text-bunny-dark">{inactiveItem.customer.fullName}</strong>
            </span>
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="space-y-4">
        {/* Info de la Clienta */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">Teléfono:</span>
              <span className="font-semibold text-slate-800">{inactiveItem.customer.phone || 'No registrado'}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Último Servicio:</span>
              <span className="font-semibold text-slate-800 truncate block" title={inactiveItem.lastServiceName}>
                {inactiveItem.lastServiceName}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Días Inactiva:</span>
              <Badge variant={inactiveItem.daysSinceLastAppointment >= 45 ? 'danger' : inactiveItem.daysSinceLastAppointment >= 30 ? 'warning' : 'info'}>
                {inactiveItem.daysSinceLastAppointment} días
              </Badge>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Historial Contacto:</span>
              {inactiveItem.isContactedRecently ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  <FaRegClock />
                  Hace {inactiveItem.daysSinceLastContact} días
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <FaCheck />
                  Disponible
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Selector de Tono de Plantilla */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-700">🎨 Selecciona el estilo del mensaje:</span>
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-bunny-primary flex items-center gap-1 transition-colors"
              onClick={handleResetToDefault}
            >
              <FaUndo /> Restablecer
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleToneChange('MAINTENANCE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                tone === 'MAINTENANCE'
                  ? 'bg-bunny-primary text-white border-bunny-primary shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              💅 Mantención Ideal (20-29d)
            </button>
            <button
              type="button"
              onClick={() => handleToneChange('MISS_YOU')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                tone === 'MISS_YOU'
                  ? 'bg-bunny-primary text-white border-bunny-primary shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              🐰 Te Extrañamos (30-44d)
            </button>
            <button
              type="button"
              onClick={() => handleToneChange('SPECIAL_OFFER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                tone === 'SPECIAL_OFFER'
                  ? 'bg-bunny-primary text-white border-bunny-primary shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              ✨ Reactivación Especial (45+d)
            </button>
          </div>
        </div>

        {/* Editor de Texto */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ✏️ Personalizar mensaje antes de enviar:
          </label>
          <textarea
            rows={5}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full font-mono text-xs rounded-xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-bunny-primary/30 focus:border-bunny-primary"
          />
        </div>

        {/* Previsualización WhatsApp */}
        <div>
          <span className="text-slate-500 font-semibold text-xs flex items-center gap-1 mb-1.5">
            <FaMagic className="text-bunny-primary" />
            Vista previa en chat:
          </span>
          <div className="p-3 rounded-2xl bg-[#e5ddd5] shadow-inner">
            <div className="bg-white rounded-xl rounded-tr-none p-3 max-w-[92%] shadow-sm text-slate-900 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
              {messageText}
              <div className="text-right mt-1 text-[10px] text-slate-500 font-sans">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
              </div>
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <div className="w-full flex justify-between items-center">
          <Button variant="secondary" size="sm" onClick={onHide}>
            Cerrar
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="flex items-center gap-1.5"
            >
              {copied ? <FaCheck className="text-emerald-500" /> : <FaCopy />}
              <span>{copied ? 'Copiado' : 'Copiar Texto'}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSendWhatsApp}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <FaWhatsapp className="text-lg" />
              <span>Enviar por WhatsApp</span>
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
