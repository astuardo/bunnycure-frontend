import { useState, useEffect } from 'react';
import { Modal, Button, Form, Badge, Row, Col, Card } from 'react-bootstrap';
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
      <Modal.Header closeButton className="border-bottom-0 pb-0">
        <Modal.Title className="d-flex align-items-center gap-2 fs-5">
          <FaWhatsapp className="text-success fs-4" />
          <span>Mensaje de Reactivación para <strong>{inactiveItem.customer.fullName}</strong></span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-3">
        {/* Info de la Clienta */}
        <div className="p-3 mb-3 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <Row className="g-2 small">
            <Col sm={6} md={3}>
              <span className="text-muted d-block">Teléfono:</span>
              <span className="fw-semibold">{inactiveItem.customer.phone || 'No registrado'}</span>
            </Col>
            <Col sm={6} md={3}>
              <span className="text-muted d-block">Último Servicio:</span>
              <span className="fw-semibold text-truncate d-block" title={inactiveItem.lastServiceName}>
                {inactiveItem.lastServiceName}
              </span>
            </Col>
            <Col sm={6} md={3}>
              <span className="text-muted d-block">Días Inactiva:</span>
              <Badge bg={inactiveItem.daysSinceLastAppointment >= 45 ? 'danger' : inactiveItem.daysSinceLastAppointment >= 30 ? 'warning' : 'info'}>
                {inactiveItem.daysSinceLastAppointment} días
              </Badge>
            </Col>
            <Col sm={6} md={3}>
              <span className="text-muted d-block">Historial Contacto:</span>
              {inactiveItem.isContactedRecently ? (
                <span className="text-warning fw-semibold">
                  <FaRegClock className="me-1" />
                  Hace {inactiveItem.daysSinceLastContact} días
                </span>
              ) : (
                <span className="text-success fw-semibold">
                  <FaCheck className="me-1" />
                  Disponible
                </span>
              )}
            </Col>
          </Row>
        </div>

        {/* Selector de Tono de Plantilla */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold small d-flex justify-content-between align-items-center">
            <span>🎨 Selecciona el estilo del mensaje:</span>
            <Button
              variant="link"
              size="sm"
              className="p-0 text-decoration-none small text-muted"
              onClick={handleResetToDefault}
            >
              <FaUndo className="me-1" /> Restablecer
            </Button>
          </Form.Label>
          <div className="d-flex gap-2 flex-wrap">
            <Button
              variant={tone === 'MAINTENANCE' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => handleToneChange('MAINTENANCE')}
              className="d-flex align-items-center gap-1"
            >
              💅 Mantención Ideal (20-29d)
            </Button>
            <Button
              variant={tone === 'MISS_YOU' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => handleToneChange('MISS_YOU')}
              className="d-flex align-items-center gap-1"
            >
              🐰 Te Extrañamos (30-44d)
            </Button>
            <Button
              variant={tone === 'SPECIAL_OFFER' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => handleToneChange('SPECIAL_OFFER')}
              className="d-flex align-items-center gap-1"
            >
              ✨ Reactivación Especial (45+d)
            </Button>
          </div>
        </Form.Group>

        {/* Editor de Texto */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold small">✏️ Personalizar mensaje antes de enviar:</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="font-monospace small"
          />
        </Form.Group>

        {/* Previsualización WhatsApp */}
        <div>
          <small className="text-muted fw-semibold d-block mb-1">
            <FaMagic className="me-1 text-primary" />
            Vista previa en chat:
          </small>
          <Card className="border-0 shadow-sm" style={{ background: '#e5ddd5', borderRadius: '12px' }}>
            <Card.Body className="p-3">
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '8px 8px 8px 0',
                  padding: '10px 14px',
                  maxWidth: '92%',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.9rem',
                  lineHeight: '1.4',
                  color: '#111827',
                }}
              >
                {messageText}
                <div className="text-end mt-1" style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Modal.Body>

      <Modal.Footer className="border-top-0 pt-0 d-flex justify-content-between">
        <Button variant="outline-secondary" size="sm" onClick={onHide}>
          Cerrar
        </Button>
        <div className="d-flex gap-2">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={handleCopyText}
            className="d-inline-flex align-items-center gap-1"
          >
            {copied ? <FaCheck className="text-success" /> : <FaCopy />}
            <span>{copied ? 'Copiado' : 'Copiar Texto'}</span>
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={handleSendWhatsApp}
            className="d-inline-flex align-items-center gap-2 fw-semibold px-3"
          >
            <FaWhatsapp className="fs-5" />
            <span>Enviar por WhatsApp</span>
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
