/**
 * Sección de configuración de templates de notificaciones push.
 * Permite personalizar título y cuerpo con variables dinámicas.
 */

import { useState, useEffect } from 'react';
import { Card, Form, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { FaBell, FaSave, FaUndo } from 'react-icons/fa';
import { appSettingsApi } from '../../api/appSettings.api';
import { useToast } from '../../hooks/useToast';

interface NotificationTemplates {
  defaultTitle: string;
  defaultBody: string;
  twoHourTitle: string;
  twoHourBody: string;
}

const VARIABLES = [
  { name: '{customerName}', description: 'Nombre completo del cliente' },
  { name: '{firstName}', description: 'Primer nombre del cliente' },
  { name: '{serviceName}', description: 'Nombre del servicio' },
  { name: '{time}', description: 'Hora de la cita (HH:mm)' },
  { name: '{date}', description: 'Fecha de la cita (dd/MM/yyyy)' },
  { name: '{minutesUntil}', description: 'Minutos hasta la cita' },
  { name: '{hoursUntil}', description: 'Horas hasta la cita' },
  { name: '{businessName}', description: 'Nombre del negocio' },
  { name: '{totalPrice}', description: 'Valor total de la cita' },
];

const DEFAULT_TEMPLATES: NotificationTemplates = {
  defaultTitle: 'Próxima Cita Agendada',
  defaultBody: 'Tienes una cita con {customerName} para {serviceName} el {date} a las {time}. Total: {totalPrice}.',
  twoHourTitle: 'Cita en 2 horas',
  twoHourBody: 'Atención: Cita con {customerName} para {serviceName} en {minutesUntil} minutos ({time}). Total estimado: {totalPrice}.',
};

export function NotificationTemplatesSection() {
  const toast = useToast();
  const [templates, setTemplates] = useState<NotificationTemplates>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const templates = await appSettingsApi.getNotificationTemplates();
      setTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Error al cargar templates de notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof NotificationTemplates, value: string) => {
    setTemplates(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await appSettingsApi.bulkUpdate({
        'notification.template.default.title': templates.defaultTitle,
        'notification.template.default.body': templates.defaultBody,
        'notification.template.2hour.title': templates.twoHourTitle,
        'notification.template.2hour.body': templates.twoHourBody,
      });
      
      setHasChanges(false);
      toast.success('Templates guardados correctamente');
    } catch (error) {
      console.error('Error saving templates:', error);
      toast.error('Error al guardar templates');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTemplates(DEFAULT_TEMPLATES);
    setHasChanges(true);
  };

  const getPreviewText = (template: string): string => {
    return template
      .replace('{customerName}', 'María González')
      .replace('{firstName}', 'María')
      .replace('{serviceName}', 'Manicure')
      .replace('{time}', '15:30')
      .replace('{date}', '15/04/2026')
      .replace('{minutesUntil}', '120')
      .replace('{hoursUntil}', '2')
      .replace('{businessName}', 'BunnyCure')
      .replace('{totalPrice}', '$29.000');
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando templates...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header className="bg-primary text-white d-flex align-items-center">
        <FaBell className="me-2" />
        <h5 className="mb-0">Templates de Notificaciones Push</h5>
      </Card.Header>
      
      <Card.Body>
        <Alert variant="info" className="d-flex align-items-start">
          <FaBell className="me-2 mt-1" />
          <div>
            <strong>Variables disponibles:</strong>
            <div className="mt-2">
              {VARIABLES.map((v, idx) => (
                <Badge 
                  key={idx} 
                  bg="secondary" 
                  className="me-2 mb-2"
                  style={{ cursor: 'pointer' }}
                  title={v.description}
                >
                  {v.name}
                </Badge>
              ))}
            </div>
            <small className="text-muted">Haz clic en una variable para copiarla</small>
          </div>
        </Alert>

        {/* Template por defecto */}
        <div className="mb-4">
          <h6 className="text-primary mb-3">📬 Notificación Estándar</h6>
          
          <Form.Group className="mb-3">
            <Form.Label>Título</Form.Label>
            <Form.Control
              type="text"
              value={templates.defaultTitle}
              onChange={(e) => handleChange('defaultTitle', e.target.value)}
              placeholder="Recordatorio de Cita"
              maxLength={50}
            />
            <Form.Text className="text-muted">
              {templates.defaultTitle.length}/50 caracteres
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Mensaje</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={templates.defaultBody}
              onChange={(e) => handleChange('defaultBody', e.target.value)}
              placeholder="Hola {customerName}, tienes una cita..."
              maxLength={200}
            />
            <Form.Text className="text-muted">
              {templates.defaultBody.length}/200 caracteres
            </Form.Text>
          </Form.Group>
        </div>

        <hr />

        {/* Template 2 horas */}
        <div className="mb-4">
          <h6 className="text-primary mb-3">⏰ Notificación 2 Horas Antes</h6>
          
          <Form.Group className="mb-3">
            <Form.Label>Título</Form.Label>
            <Form.Control
              type="text"
              value={templates.twoHourTitle}
              onChange={(e) => handleChange('twoHourTitle', e.target.value)}
              placeholder="¡Tu cita es pronto!"
              maxLength={50}
            />
            <Form.Text className="text-muted">
              {templates.twoHourTitle.length}/50 caracteres
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Mensaje</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={templates.twoHourBody}
              onChange={(e) => handleChange('twoHourBody', e.target.value)}
              placeholder="Tu cita es en {minutesUntil} minutos..."
              maxLength={200}
            />
            <Form.Text className="text-muted">
              {templates.twoHourBody.length}/200 caracteres
            </Form.Text>
          </Form.Group>
        </div>

        {/* Preview */}
        <div className="mb-4">
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={() => setShowPreview(!showPreview)}
            className="mb-3"
          >
            {showPreview ? '🙈 Ocultar' : '👁️ Ver'} Vista Previa
          </Button>

          {showPreview && (
            <>
              <Alert variant="light" className="border">
                <div className="mb-3">
                  <strong>📬 Notificación Estándar:</strong>
                  <div className="p-3 bg-white border rounded mt-2">
                    <div className="fw-bold">{getPreviewText(templates.defaultTitle)}</div>
                    <div className="text-muted small">{getPreviewText(templates.defaultBody)}</div>
                  </div>
                </div>
                
                <div>
                  <strong>⏰ Notificación 2 Horas:</strong>
                  <div className="p-3 bg-white border rounded mt-2">
                    <div className="fw-bold">{getPreviewText(templates.twoHourTitle)}</div>
                    <div className="text-muted small">{getPreviewText(templates.twoHourBody)}</div>
                  </div>
                </div>
              </Alert>
            </>
          )}
        </div>

        {/* Botones de acción */}
        <div className="d-flex gap-2">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Guardando...
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                Guardar Cambios
              </>
            )}
          </Button>

          <Button
            variant="outline-secondary"
            onClick={handleReset}
            disabled={saving}
          >
            <FaUndo className="me-2" />
            Restaurar Defaults
          </Button>
        </div>

        {hasChanges && (
          <Alert variant="warning" className="mt-3 mb-0">
            <small>⚠️ Tienes cambios sin guardar</small>
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
}
