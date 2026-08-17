import React, { useState } from 'react';
import { Modal, Button, Form, Badge, ButtonGroup } from 'react-bootstrap';
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
      <Modal.Header closeButton style={{ background: '#fdf4f2', borderBottom: '1px solid #eed0c5' }}>
        <Modal.Title style={{ color: '#422314', fontSize: '1.15rem', fontWeight: 700 }}>
          🎂 Enviar Saludo de Cumpleaños &bull; {customerName}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-3 p-md-4" style={{ background: '#fff9f8' }}>
        {/* Info de la Clienta */}
        <div
          className="d-flex justify-content-between align-items-center mb-3 p-3 rounded-3"
          style={{ background: '#fff', border: '1px solid #eed0c5' }}
        >
          <div>
            <div className="fw-bold" style={{ color: '#422314', fontSize: '15px' }}>
              {customerName}
            </div>
            <small style={{ color: '#8c6052' }}>
              📅 Cumpleaños: <strong>{birthdayCustomer.formattedBirthDay}</strong>
              {birthdayCustomer.ageToTurn && ` (${birthdayCustomer.ageToTurn} años)`} &bull; 📱 {customerPhone || 'Sin teléfono'}
            </small>
          </div>
          {birthdayCustomer.isToday ? (
            <Badge bg="danger" style={{ fontSize: '12px', padding: '6px 10px' }}>
              🎉 ¡CUMPLE HOY!
            </Badge>
          ) : (
            <Badge bg="light" text="dark" style={{ border: '1px solid #eed0c5' }}>
              Faltan {birthdayCustomer.daysUntilBirthday} día(s)
            </Badge>
          )}
        </div>

        {/* Selector de Tono / Tipo de Beneficio */}
        <div className="mb-3">
          <label className="form-label fw-bold small text-muted mb-2">SELECCIONA EL TIPO DE SALUDO Y BENEFICIO:</label>
          <ButtonGroup className="w-100">
            <Button
              variant={tone === 'DISCOUNT' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setTone('DISCOUNT')}
              style={{
                background: tone === 'DISCOUNT' ? '#8c2a3e' : '#fff',
                borderColor: '#eed0c5',
                color: tone === 'DISCOUNT' ? '#fff' : '#8c2a3e',
                fontWeight: 600,
              }}
            >
              <FiPercent className="me-1" /> 15% Descuento
            </Button>
            <Button
              variant={tone === 'GIFT' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setTone('GIFT')}
              style={{
                background: tone === 'GIFT' ? '#8c2a3e' : '#fff',
                borderColor: '#eed0c5',
                color: tone === 'GIFT' ? '#fff' : '#8c2a3e',
                fontWeight: 600,
              }}
            >
              <FiGift className="me-1" /> Regalo / Nail Art
            </Button>
            <Button
              variant={tone === 'SIMPLE' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setTone('SIMPLE')}
              style={{
                background: tone === 'SIMPLE' ? '#8c2a3e' : '#fff',
                borderColor: '#eed0c5',
                color: tone === 'SIMPLE' ? '#fff' : '#8c2a3e',
                fontWeight: 600,
              }}
            >
              <FiSmile className="me-1" /> Saludo Cariñoso
            </Button>
          </ButtonGroup>
        </div>

        {/* Vista previa y edición del mensaje */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label className="form-label fw-bold small text-muted mb-0">MENSAJE PERSONALIZABLE:</label>
            <Button variant="link" size="sm" onClick={handleCopy} className="p-0 text-decoration-none" style={{ color: '#8c2a3e', fontSize: '12px' }}>
              {isCopied ? <><FaCheck className="me-1 text-success" /> Copiado</> : <><FaCopy className="me-1" /> Copiar texto</>}
            </Button>
          </div>
          <Form.Control
            as="textarea"
            rows={7}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            style={{
              borderRadius: '10px',
              borderColor: '#eed0c5',
              fontSize: '13.5px',
              lineHeight: 1.45,
              background: '#fff',
            }}
          />
          <small style={{ color: '#8c6052', fontSize: '11.5px', display: 'block', marginTop: '4px' }}>
            ℹ️ Número oficial de atención: <strong>{BUNNYCURE_OFFICIAL_PHONE}</strong>
          </small>
        </div>
      </Modal.Body>

      <Modal.Footer style={{ background: '#fdf4f2', borderTop: '1px solid #eed0c5' }}>
        <Button variant="secondary" size="sm" onClick={onHide} style={{ borderRadius: '8px' }}>
          Cancelar
        </Button>
        <Button
          variant="success"
          size="sm"
          onClick={handleSendWhatsApp}
          disabled={!customerPhone}
          style={{
            background: '#25D366',
            borderColor: '#25D366',
            borderRadius: '8px',
            fontWeight: 700,
            padding: '7px 18px',
          }}
        >
          <FaWhatsapp className="me-1" style={{ fontSize: '16px' }} /> Enviar Saludo por WhatsApp
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
