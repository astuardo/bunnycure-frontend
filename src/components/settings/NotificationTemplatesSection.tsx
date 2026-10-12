/**
 * Sección de configuración de templates de notificaciones push.
 * Permite personalizar título y cuerpo con variables dinámicas.
 */

import { useState, useEffect } from 'react';
import { FaBell, FaSave, FaUndo } from 'react-icons/fa';
import { appSettingsApi } from '../../api/appSettings.api';
import { useToast } from '../../hooks/useToast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

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
      <Card className="mb-6">
        <Card.Body className="text-center py-12">
          <Spinner size="md" className="mx-auto mb-2" />
          <p className="text-xs text-bunny-text-muted">Cargando templates...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <Card.Header className="flex items-center gap-2">
        <FaBell className="text-bunny-primary" />
        <Card.Title>Templates de Notificaciones Push</Card.Title>
      </Card.Header>
      
      <Card.Body className="space-y-6">
        <div className="p-4 rounded-xl border border-purple-200 bg-purple-50 text-purple-900 text-xs flex items-start gap-3">
          <FaBell className="mt-1 flex-shrink-0" />
          <div>
            <strong>Variables disponibles:</strong>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {VARIABLES.map((v, idx) => (
                <span
                  key={idx}
                  title={v.description}
                  className="inline-block"
                >
                  <Badge variant="neutral" className="cursor-pointer hover:bg-slate-200 transition-colors">
                    {v.name}
                  </Badge>
                </span>
              ))}
            </div>
            <p className="text-[11px] text-purple-700 mt-1">Haz clic en una variable para ver su descripción</p>
          </div>
        </div>

        {/* Template por defecto */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-bunny-primary uppercase tracking-wider">
            📬 Notificación Estándar
          </h4>
          
          <div>
            <label className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
              Título
            </label>
            <input
              type="text"
              value={templates.defaultTitle}
              onChange={(e) => handleChange('defaultTitle', e.target.value)}
              placeholder="Recordatorio de Cita"
              maxLength={50}
              className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
            />
            <span className="text-[11px] text-bunny-text-muted mt-0.5 block">
              {templates.defaultTitle.length}/50 caracteres
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
              Mensaje
            </label>
            <textarea
              rows={3}
              value={templates.defaultBody}
              onChange={(e) => handleChange('defaultBody', e.target.value)}
              placeholder="Hola {customerName}, tienes una cita..."
              maxLength={200}
              className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
            />
            <span className="text-[11px] text-bunny-text-muted mt-0.5 block">
              {templates.defaultBody.length}/200 caracteres
            </span>
          </div>
        </div>

        <hr className="border-bunny-border/50" />

        {/* Template 2 horas */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-bunny-primary uppercase tracking-wider">
            ⏰ Notificación 2 Horas Antes
          </h4>
          
          <div>
            <label className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
              Título
            </label>
            <input
              type="text"
              value={templates.twoHourTitle}
              onChange={(e) => handleChange('twoHourTitle', e.target.value)}
              placeholder="¡Tu cita es pronto!"
              maxLength={50}
              className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
            />
            <span className="text-[11px] text-bunny-text-muted mt-0.5 block">
              {templates.twoHourTitle.length}/50 caracteres
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
              Mensaje
            </label>
            <textarea
              rows={3}
              value={templates.twoHourBody}
              onChange={(e) => handleChange('twoHourBody', e.target.value)}
              placeholder="Tu cita es en {minutesUntil} minutos..."
              maxLength={200}
              className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
            />
            <span className="text-[11px] text-bunny-text-muted mt-0.5 block">
              {templates.twoHourBody.length}/200 caracteres
            </span>
          </div>
        </div>

        {/* Preview */}
        <div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? '🙈 Ocultar' : '👁️ Ver'} Vista Previa
          </Button>

          {showPreview && (
            <div className="p-4 rounded-xl border border-bunny-border bg-bunny-paper/40 space-y-4 mt-3">
              <div>
                <strong className="text-xs text-bunny-text uppercase tracking-wider">📬 Notificación Estándar:</strong>
                <div className="p-3 bg-white border border-bunny-border rounded-xl mt-1.5 shadow-sm">
                  <div className="font-bold text-xs text-bunny-text">{getPreviewText(templates.defaultTitle)}</div>
                  <div className="text-xs text-bunny-text-muted mt-0.5">{getPreviewText(templates.defaultBody)}</div>
                </div>
              </div>
              
              <div>
                <strong className="text-xs text-bunny-text uppercase tracking-wider">⏰ Notificación 2 Horas:</strong>
                <div className="p-3 bg-white border border-bunny-border rounded-xl mt-1.5 shadow-sm">
                  <div className="font-bold text-xs text-bunny-text">{getPreviewText(templates.twoHourTitle)}</div>
                  <div className="text-xs text-bunny-text-muted mt-0.5">{getPreviewText(templates.twoHourBody)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            isLoading={saving}
            leftIcon={<FaSave />}
          >
            Guardar Cambios
          </Button>

          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
            leftIcon={<FaUndo />}
          >
            Restaurar Defaults
          </Button>
        </div>

        {hasChanges && (
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs">
            ⚠️ Tienes cambios sin guardar
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
