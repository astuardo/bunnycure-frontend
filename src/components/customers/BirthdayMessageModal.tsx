import React, { useState } from 'react';
import { Modal, Button, Badge, Spinner } from '@/components/ui';
import { FaWhatsapp, FaCopy, FaCheck } from 'react-icons/fa';
import { FiGift, FiSmile, FiPercent } from 'react-icons/fi';
import { BirthdayCustomer, BirthdayTone } from '../../types/birthday.types';
import {
  buildBirthdayGreetingMessage,
  buildBirthdayWhatsAppUrl,
  recordBirthdayGreeting,
  BUNNYCURE_OFFICIAL_PHONE,
} from '../../utils/birthdayUtils';
import { useToast } from '../../hooks/useToast';
import { marketingApi } from '../../api/marketing.api';

interface BirthdayMessageModalProps {
  show: boolean;
  onHide: () => void;
  birthdayCustomer: BirthdayCustomer | null;
  onGreetingSent?: () => void;
}

export const BirthdayMessageModal: React.FC<BirthdayMessageModalProps> = ({
  show,
  onHide,
  birthdayCustomer,
  onGreetingSent,
}) => {
  const toast = useToast();
  const [tone, setTone] = useState<BirthdayTone>('DISCOUNT');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [sendingMeta, setSendingMeta] = useState(false);

  // Inicializar o actualizar el mensaje cuando cambia la clienta o el tono
  React.useEffect(() => {
    if (birthdayCustomer) {
      const name = birthdayCustomer.customer.fullName || 'Clienta';
      setCustomMessage(buildBirthdayGreetingMessage(name, tone));
      setIsCopied(false);
    }
  }, [birthdayCustomer, tone]);

  if (!birthdayCustomer) return null;

  const customerName = birthdayCustomer.customer.fullName || 'Clienta';
  const customerPhone = birthdayCustomer.customer.phone || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customMessage);
      setIsCopied(true);
      toast.success('📋 Mensaje de cumpleaños copiado al portapapeles');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      toast.error('No se pudo copiar el texto');
    }
  };

  const handleSendMetaOfficial = async () => {
    if (!customerPhone) {
      toast.error('La clienta no tiene un teléfono registrado');
      return;
    }

    setSendingMeta(true);
    try {
      const benefitText =
        tone === 'DISCOUNT'
          ? 'un 15% de descuento exclusivo en tu próxima cita'
          : tone === 'GIFT'
          ? 'un Nail Art de regalo en tu cita'
          : 'nuestros mejores deseos y un regaloneo especial';

      const res = await marketingApi.dispatchCampaign({
        templateName: 'saludo_cumpleanos_bunnycure',
        audienceType: 'ALL',
        testPhoneNumber: customerPhone,
        customBenefit: benefitText,
      });

      if (res.sentCount > 0) {
        recordBirthdayGreeting(birthdayCustomer.customer.id);
        toast.success(`🎂 Saludo oficial de cumpleaños enviado a ${customerName} por Meta WhatsApp`);
        onGreetingSent?.();
        onHide();
      } else {
        const err = res.errorMessages?.join(', ') || 'No se pudo entregar el mensaje';
        toast.error(`Error: ${err}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar plantilla oficial por Meta API');
    } finally {
      setSendingMeta(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!customerPhone) {
      toast.error('La clienta no tiene un teléfono registrado');
      return;
    }

    const url = buildBirthdayWhatsAppUrl(customerPhone, customMessage);
    recordBirthdayGreeting(birthdayCustomer.customer.id);
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success(`🎂 Saludo enviado a ${customerName} por WhatsApp`);

    if (onGreetingSent) {
      onGreetingSent();
    }
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-bunny-light/30 border-b border-bunny-accent/40">
        <Modal.Title>
          <span className="text-bunny-dark font-bold text-base sm:text-lg">
            🎂 Enviar Saludo de Cumpleaños &bull; {customerName}
          </span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4 sm:p-5 space-y-4 bg-bunny-creamy/30">
        {/* Info de la Clienta */}
        <div className="flex justify-between items-center p-3 rounded-xl bg-white border border-bunny-accent/50 shadow-sm">
          <div>
            <div className="font-bold text-bunny-dark text-sm sm:text-base">
              {customerName}
            </div>
            <div className="text-xs text-bunny-dark/70 mt-0.5">
              📅 Cumpleaños: <strong className="text-bunny-dark">{birthdayCustomer.formattedBirthDay}</strong>
              {birthdayCustomer.ageToTurn && ` (${birthdayCustomer.ageToTurn} años)`} &bull; 📱 {customerPhone || 'Sin teléfono'}
            </div>
          </div>
          {birthdayCustomer.isToday ? (
            <Badge variant="danger" className="text-xs px-2.5 py-1">
              🎉 ¡CUMPLE HOY!
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Faltan {birthdayCustomer.daysUntilBirthday} día(s)
            </Badge>
          )}
        </div>

        {/* Selector de Tono / Tipo de Beneficio */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            SELECCIONA EL TIPO DE SALUDO Y BENEFICIO:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTone('DISCOUNT')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                tone === 'DISCOUNT'
                  ? 'bg-bunny-primary text-white border-bunny-primary shadow-sm'
                  : 'bg-white text-bunny-primary border-bunny-accent/60 hover:bg-bunny-light/40'
              }`}
            >
              <FiPercent /> 15% Descuento
            </button>
            <button
              type="button"
              onClick={() => setTone('GIFT')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                tone === 'GIFT'
                  ? 'bg-bunny-primary text-white border-bunny-primary shadow-sm'
                  : 'bg-white text-bunny-primary border-bunny-accent/60 hover:bg-bunny-light/40'
              }`}
            >
              <FiGift /> Regalo / Nail Art
            </button>
            <button
              type="button"
              onClick={() => setTone('SIMPLE')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                tone === 'SIMPLE'
                  ? 'bg-bunny-primary text-white border-bunny-primary shadow-sm'
                  : 'bg-white text-bunny-primary border-bunny-accent/60 hover:bg-bunny-light/40'
              }`}
            >
              <FiSmile /> Saludo Cariñoso
            </button>
          </div>
        </div>

        {/* Vista previa y edición del mensaje */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              MENSAJE PERSONALIZABLE:
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-bunny-primary hover:text-bunny-dark font-medium flex items-center gap-1 transition-colors"
            >
              {isCopied ? (
                <>
                  <FaCheck className="text-emerald-500" /> Copiado
                </>
              ) : (
                <>
                  <FaCopy /> Copiar texto
                </>
              )}
            </button>
          </div>
          <textarea
            rows={6}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full text-xs sm:text-sm leading-relaxed p-3 rounded-xl border border-bunny-accent/70 bg-white focus:outline-none focus:ring-2 focus:ring-bunny-primary/30 focus:border-bunny-primary"
          />
          <span className="block text-[11px] text-bunny-dark/70 mt-1">
            ℹ️ Número oficial de atención: <strong className="text-bunny-dark">{BUNNYCURE_OFFICIAL_PHONE}</strong>
          </span>
        </div>
      </Modal.Body>

      <Modal.Footer className="bg-bunny-light/20 border-t border-bunny-accent/40">
        <div className="w-full flex justify-between items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onHide}>
            Cerrar
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendWhatsApp}
              disabled={!customerPhone}
              title="Abre WhatsApp Web con el texto libre editado arriba"
              className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
            >
              <FaWhatsapp className="text-emerald-600 mr-1.5" />
              <span className="hidden sm:inline">WhatsApp Web</span> (Texto Libre)
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSendMetaOfficial}
              disabled={sendingMeta || !customerPhone}
              title="Envía la plantilla oficial con botón interactivo por Meta API"
              className="bg-bunny-primary hover:bg-bunny-dark text-white font-semibold"
            >
              {sendingMeta ? (
                <>
                  <Spinner size="sm" className="mr-1.5 border-white" /> Enviando...
                </>
              ) : (
                <>
                  <FaWhatsapp className="text-emerald-400 mr-1.5" /> Enviar Oficial Meta (1 Clic)
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default BirthdayMessageModal;
