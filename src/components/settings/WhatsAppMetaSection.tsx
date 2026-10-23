import React, { useState, useEffect, useCallback } from 'react';
import { FaWhatsapp, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaSyncAlt, FaShieldAlt } from 'react-icons/fa';
import { FiSave, FiGlobe, FiMail, FiMapPin, FiInfo, FiLayers } from 'react-icons/fi';
import {
  settingsApi,
  WhatsAppMetaStatusResponse,
  WhatsAppBusinessProfile,
  WhatsAppMetaTemplate,
} from '../../api/settings.api';
import { useToast } from '../../hooks/useToast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

export const WhatsAppMetaSection: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [metaStatus, setMetaStatus] = useState<WhatsAppMetaStatusResponse | null>(null);
  const [profileData, setProfileData] = useState<WhatsAppBusinessProfile>({
    about: '',
    description: '',
    address: '',
    email: '',
    websites: ['https://bunnycure.cl'],
    vertical: 'BEAUTY_SALON',
  });
  const [templateFilter, setTemplateFilter] = useState<string>('ALL');

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getWhatsAppMetaStatus();
      setMetaStatus(data);

      if (data.businessProfile?.data && data.businessProfile.data.length > 0) {
        const p = data.businessProfile.data[0];
        setProfileData({
          about: p.about || '',
          description: p.description || '',
          address: p.address || '',
          email: p.email || '',
          websites: p.websites && p.websites.length > 0 ? p.websites : ['https://bunnycure.cl'],
          vertical: p.vertical || 'BEAUTY_SALON',
        });
      }
    } catch (err: any) {
      console.error('Error fetching WhatsApp Meta status:', err);
      toast.error(err?.response?.data?.message || 'No se pudo sincronizar el estado con Meta Cloud API.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const res = await settingsApi.updateWhatsAppBusinessProfile(profileData);
      toast.success(res.message || 'El perfil comercial se sincronizó con Meta exitosamente.');
      fetchStatus();
    } catch (err: any) {
      console.error('Error updating business profile:', err);
      toast.error(err?.response?.data?.message || 'No se pudo actualizar el perfil comercial en Meta.');
    } finally {
      setSavingProfile(false);
    }
  };

  const getQualityBadge = (rating?: string) => {
    switch (rating?.toUpperCase()) {
      case 'GREEN':
        return (
          <Badge variant="success" className="px-2.5 py-1 flex items-center gap-1 w-fit">
            <FaCheckCircle /> Calidad Alta (GREEN)
          </Badge>
        );
      case 'YELLOW':
        return (
          <Badge variant="warning" className="px-2.5 py-1 flex items-center gap-1 w-fit">
            <FaExclamationTriangle /> Calidad Media (YELLOW)
          </Badge>
        );
      case 'RED':
        return (
          <Badge variant="danger" className="px-2.5 py-1 flex items-center gap-1 w-fit">
            <FaTimesCircle /> Calidad Baja / Riesgo (RED)
          </Badge>
        );
      default:
        return <Badge variant="neutral" className="px-2.5 py-1">Desconocida</Badge>;
    }
  };

  const getTierLabel = (tier?: string) => {
    switch (tier) {
      case 'TIER_250':
        return '250 conversaciones / 24h';
      case 'TIER_1K':
        return '1.000 conversaciones / 24h';
      case 'TIER_10K':
        return '10.000 conversaciones / 24h';
      case 'TIER_100K':
        return '100.000 conversaciones / 24h';
      case 'TIER_UNLIMITED':
        return 'Ilimitado';
      default:
        return tier || 'Estándar';
    }
  };

  const getTemplateStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return (
          <Badge variant="success" className="flex items-center gap-1 w-fit">
            <FaCheckCircle /> Aprobada
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="danger" className="flex items-center gap-1 w-fit">
            <FaTimesCircle /> Rechazada
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="warning" className="flex items-center gap-1 w-fit">
            <FaExclamationTriangle /> En Revisión
          </Badge>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const templates: WhatsAppMetaTemplate[] = metaStatus?.templates?.data || [];
  const filteredTemplates = templates.filter((t) => {
    if (templateFilter === 'ALL') return true;
    return t.category?.toUpperCase() === templateFilter;
  });

  return (
    <div className="space-y-6">
      {/* ─── 1. TARJETA DE SALUD Y SEMÁFORO META ─── */}
      <Card>
        <Card.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white py-3.5">
          <div className="flex items-center gap-2">
            <FaWhatsapp className="text-emerald-600 text-xl" />
            <h3 className="text-sm font-bold text-bunny-text leading-tight">
              Estado y Salud de la Cuenta Meta WhatsApp
            </h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchStatus}
            disabled={loading}
            leftIcon={<FaSyncAlt className={loading ? 'animate-spin' : ''} />}
          >
            Actualizar
          </Button>
        </Card.Header>
        <Card.Body className="p-4 sm:p-6">
          {loading && !metaStatus ? (
            <div className="text-center py-8">
              <Spinner size="md" className="mx-auto mb-2" />
              <p className="text-xs text-bunny-text-muted">Consultando Meta Graph API v22.0...</p>
            </div>
          ) : !metaStatus?.configured ? (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs flex items-center gap-2">
              <FaExclamationTriangle className="text-base flex-shrink-0" />
              <span>WhatsApp Cloud API no está configurada o falta el token/Phone ID en las propiedades del sistema.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-bunny-paper rounded-xl border border-bunny-border">
                <span className="text-xs text-bunny-text-muted block font-semibold mb-1.5">
                  Reputación y Calidad
                </span>
                <div>{getQualityBadge(metaStatus.health?.quality_rating)}</div>
                <p className="text-[11px] text-bunny-text-muted mt-2">
                  Evaluación de Meta basada en reportes y bloqueos de clientes.
                </p>
              </div>

              <div className="p-4 bg-bunny-paper rounded-xl border border-bunny-border">
                <span className="text-xs text-bunny-text-muted block font-semibold mb-1.5">
                  Límite de Envíos Diarios
                </span>
                <div className="font-bold text-bunny-text text-sm">{getTierLabel(metaStatus.health?.messaging_limit_tier)}</div>
                <p className="text-[11px] text-bunny-text-muted mt-2">
                  Tier de capacidad para mensajes iniciados por la empresa.
                </p>
              </div>

              <div className="p-4 bg-bunny-paper rounded-xl border border-bunny-border sm:col-span-2 md:col-span-1">
                <span className="text-xs text-bunny-text-muted block font-semibold mb-1.5">
                  Nombre Verificado &amp; Teléfono
                </span>
                <div className="font-bold text-bunny-primary text-sm flex items-center gap-1.5">
                  <FaShieldAlt className="text-emerald-600" />
                  {metaStatus.health?.verified_name || 'BunnyCure'}
                </div>
                <div className="text-xs text-bunny-text font-mono mt-1">
                  {metaStatus.health?.display_phone_number || metaStatus.phoneId}
                </div>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ─── 2. PERFIL COMERCIAL DE WHATSAPP ─── */}
      <Card>
        <Card.Header className="flex items-center gap-2 bg-white py-3.5">
          <FiInfo className="text-bunny-primary text-lg" />
          <h3 className="text-sm font-bold text-bunny-text leading-tight">
            Perfil Comercial en WhatsApp (Meta Business Profile)
          </h3>
        </Card.Header>
        <Card.Body className="p-4 sm:p-6">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="whats-app-meta-descripcion-corta-slogan-about" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                  Descripción Corta / Slogan (About)
                </label>
                <input id="whats-app-meta-descripcion-corta-slogan-about"
                  type="text"
                  maxLength={139}
                  value={profileData.about}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, about: e.target.value }))}
                  placeholder="Ej: Salón de Manicura y Belleza BunnyCure ✨"
                  className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                />
                <span className="text-[11px] text-bunny-text-muted mt-0.5 block">
                  Aparece debajo del nombre en el chat de WhatsApp.
                </span>
              </div>

              <div>
                <label htmlFor="whats-app-meta-correo-de-contacto" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                  Correo de Contacto
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-bunny-text-muted" />
                  <input id="whats-app-meta-correo-de-contacto"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="contacto@bunnycure.cl"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-bunny-border bg-white text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="whats-app-meta-direccion-fisica-del-salon" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                  Dirección Física del Salón
                </label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-bunny-text-muted" />
                  <input id="whats-app-meta-direccion-fisica-del-salon"
                    type="text"
                    value={profileData.address}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Ej: Providencia, Santiago"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-bunny-border bg-white text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="whats-app-meta-sitio-web-oficial" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                  Sitio Web Oficial
                </label>
                <div className="relative">
                  <FiGlobe className="absolute left-3 top-1/2 -translate-y-1/2 text-bunny-text-muted" />
                  <input id="whats-app-meta-sitio-web-oficial"
                    type="url"
                    value={profileData.websites?.[0] || ''}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, websites: [e.target.value] }))}
                    placeholder="https://bunnycure.cl"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-bunny-border bg-white text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="whats-app-meta-descripcion-extensa-del-negocio" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                  Descripción Extensa del Negocio
                </label>
                <textarea id="whats-app-meta-descripcion-extensa-del-negocio"
                  rows={3}
                  maxLength={512}
                  value={profileData.description}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="BunnyCure es un estudio especializado en manicura rusa, esmaltado permanente y cuidado de uñas..."
                  className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                />
                <span className="text-[11px] text-bunny-text-muted mt-0.5 block">
                  Se muestra en la ficha de empresa de WhatsApp Business.
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={savingProfile}
                isLoading={savingProfile}
                leftIcon={<FiSave />}
              >
                Guardar Perfil en Meta WhatsApp
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>

      {/* ─── 3. VISOR DE PLANTILLAS META EN TIEMPO REAL ─── */}
      <Card>
        <Card.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white py-3.5">
          <div className="flex items-center gap-2">
            <FiLayers className="text-bunny-primary text-lg" />
            <h3 className="text-sm font-bold text-bunny-text leading-tight">
              Plantillas Registradas en Meta ({templates.length})
            </h3>
          </div>

          <div className="flex gap-2">
            <select
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              className="rounded-xl border border-bunny-border bg-white px-3 py-1.5 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
            >
              <option value="ALL">Todas ({templates.length})</option>
              <option value="UTILITY">Utilidad (Operativas)</option>
              <option value="MARKETING">Marketing</option>
            </select>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {templates.length === 0 ? (
            <div className="p-6 text-center text-bunny-text-muted text-xs">
              No se detectaron plantillas en la cuenta o falta consultar Meta Graph API.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-bunny-paper/60 text-bunny-text-muted font-semibold border-b border-bunny-border uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Nombre de la Plantilla</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Estado Meta</th>
                    <th className="py-3 px-4">Idioma</th>
                    <th className="py-3 px-4">Botones y Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bunny-border/30">
                  {filteredTemplates.map((tpl) => {
                    const buttonsComponent = tpl.components?.find((c) => c.type === 'BUTTONS');
                    const buttons = buttonsComponent?.buttons || [];

                    return (
                      <tr key={tpl.name} className="hover:bg-bunny-paper/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold font-mono text-bunny-text">{tpl.name}</div>
                          {tpl.name === 'recordatorio_cita' && (
                            <span className="text-[11px] text-bunny-text-muted block mt-0.5">Recordatorio 24h / 2h con confirmación y reprogramación</span>
                          )}
                          {tpl.name === 'confirmacion_cita' && (
                            <span className="text-[11px] text-bunny-text-muted block mt-0.5">Aviso de cita confirmada + fidelización</span>
                          )}
                          {tpl.name === 'confirmacion_hora' && (
                            <span className="text-[11px] text-bunny-text-muted block mt-0.5">Alerta interna a especialista / admin</span>
                          )}
                          {tpl.name === 'cancelacion_cita' && (
                            <span className="text-[11px] text-bunny-text-muted block mt-0.5">Aviso de cancelación + enlace a reagendar</span>
                          )}
                          {tpl.name === 'valoracion_servicio_google' && (
                            <span className="text-[11px] text-bunny-text-muted block mt-0.5">Solicitud de reseña en Google Maps</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={tpl.category === 'UTILITY' ? 'info' : 'primary'}>
                            {tpl.category}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{getTemplateStatusBadge(tpl.status)}</td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded border border-bunny-border bg-bunny-paper font-mono text-[11px]">
                            {tpl.language}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {buttons.length === 0 ? (
                            <span className="text-bunny-text-muted">Sin botones</span>
                          ) : (
                            <div className="flex gap-1 flex-wrap">
                              {buttons.map((btn, idx) => (
                                <Badge key={idx} variant="neutral">
                                  {btn.text} ({btn.type})
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};
