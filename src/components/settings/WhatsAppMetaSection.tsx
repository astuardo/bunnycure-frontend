import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Badge, Button, Form, Spinner, Alert, Table, InputGroup } from 'react-bootstrap';
import { FaWhatsapp, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaSyncAlt, FaShieldAlt } from 'react-icons/fa';
import { FiSave, FiGlobe, FiMail, FiMapPin, FiInfo, FiLayers } from 'react-icons/fi';
import {
  settingsApi,
  WhatsAppMetaStatusResponse,
  WhatsAppBusinessProfile,
  WhatsAppMetaTemplate,
} from '../../api/settings.api';
import { useToast } from '../../hooks/useToast';

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
        return <Badge bg="success" className="px-2 py-1"><FaCheckCircle className="me-1" /> Calidad Alta (GREEN)</Badge>;
      case 'YELLOW':
        return <Badge bg="warning" text="dark" className="px-2 py-1"><FaExclamationTriangle className="me-1" /> Calidad Media (YELLOW)</Badge>;
      case 'RED':
        return <Badge bg="danger" className="px-2 py-1"><FaTimesCircle className="me-1" /> Calidad Baja / Riesgo (RED)</Badge>;
      default:
        return <Badge bg="secondary" className="px-2 py-1">Desconocida</Badge>;
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
        return <Badge bg="success"><FaCheckCircle className="me-1" /> Aprobada</Badge>;
      case 'REJECTED':
        return <Badge bg="danger"><FaTimesCircle className="me-1" /> Rechazada</Badge>;
      case 'PENDING':
        return <Badge bg="warning" text="dark"><FaExclamationTriangle className="me-1" /> En Revisión</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const templates: WhatsAppMetaTemplate[] = metaStatus?.templates?.data || [];
  const filteredTemplates = templates.filter((t) => {
    if (templateFilter === 'ALL') return true;
    return t.category?.toUpperCase() === templateFilter;
  });

  return (
    <div className="whatsapp-meta-section">
      {/* ─── 1. TARJETA DE SALUD Y SEMÁFORO META ─── */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaWhatsapp className="text-success fs-4" />
            <h5 className="mb-0 fs-6 fw-bold">Estado y Salud de la Cuenta Meta WhatsApp</h5>
          </div>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={fetchStatus}
            disabled={loading}
            className="d-flex align-items-center gap-1"
          >
            <FaSyncAlt className={loading ? 'fa-spin' : ''} />
            <span>Actualizar</span>
          </Button>
        </Card.Header>
        <Card.Body className="p-4">
          {loading && !metaStatus ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="success" />
              <p className="text-muted mt-2 small">Consultando Meta Graph API v22.0...</p>
            </div>
          ) : !metaStatus?.configured ? (
            <Alert variant="warning" className="mb-0">
              <FaExclamationTriangle className="me-2" />
              WhatsApp Cloud API no está configurada o falta el token/Phone ID en las propiedades del sistema.
            </Alert>
          ) : (
            <Row className="g-3">
              <Col md={4} sm={6}>
                <div className="p-3 bg-light rounded-3 border">
                  <span className="small text-muted d-block fw-semibold mb-1">Reputación y Calidad</span>
                  <div>{getQualityBadge(metaStatus.health?.quality_rating)}</div>
                  <div className="small text-muted mt-1" style={{ fontSize: '0.8rem' }}>
                    Evaluación de Meta basada en reportes y bloqueos de clientes.
                  </div>
                </div>
              </Col>

              <Col md={4} sm={6}>
                <div className="p-3 bg-light rounded-3 border">
                  <span className="small text-muted d-block fw-semibold mb-1">Límite de Envíos Diarios</span>
                  <div className="fw-bold text-dark fs-6">{getTierLabel(metaStatus.health?.messaging_limit_tier)}</div>
                  <div className="small text-muted mt-1" style={{ fontSize: '0.8rem' }}>
                    Tier de capacidad para mensajes iniciados por la empresa.
                  </div>
                </div>
              </Col>

              <Col md={4} sm={12}>
                <div className="p-3 bg-light rounded-3 border">
                  <span className="small text-muted d-block fw-semibold mb-1">Nombre Verificado &amp; Teléfono</span>
                  <div className="fw-bold text-primary">
                    <FaShieldAlt className="me-1 text-success" />
                    {metaStatus.health?.verified_name || 'BunnyCure'}
                  </div>
                  <div className="small text-dark mt-1 font-monospace">
                    {metaStatus.health?.display_phone_number || metaStatus.phoneId}
                  </div>
                </div>
              </Col>
            </Row>
          )}
        </Card.Body>
      </Card>

      {/* ─── 2. PERFIL COMERCIAL DE WHATSAPP ─── */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-white py-3">
          <div className="d-flex align-items-center gap-2">
            <FiInfo className="text-primary fs-5" />
            <h5 className="mb-0 fs-6 fw-bold">Perfil Comercial en WhatsApp (Meta Business Profile)</h5>
          </div>
        </Card.Header>
        <Card.Body className="p-4">
          <Form onSubmit={handleSaveProfile}>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Descripción Corta / Slogan (About)</Form.Label>
                  <Form.Control
                    type="text"
                    maxLength={139}
                    value={profileData.about}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, about: e.target.value }))}
                    placeholder="Ej: Salón de Manicura y Belleza BunnyCure ✨"
                  />
                  <Form.Text className="text-muted">Aparece debajo del nombre en el chat de WhatsApp.</Form.Text>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Correo de Contacto</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FiMail /></InputGroup.Text>
                    <Form.Control
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="contacto@bunnycure.cl"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Dirección Física del Salón</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FiMapPin /></InputGroup.Text>
                    <Form.Control
                      type="text"
                      value={profileData.address}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Ej: Providencia, Santiago"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Sitio Web Oficial</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FiGlobe /></InputGroup.Text>
                    <Form.Control
                      type="url"
                      value={profileData.websites?.[0] || ''}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, websites: [e.target.value] }))}
                      placeholder="https://bunnycure.cl"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Descripción Extensa del Negocio</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    maxLength={512}
                    value={profileData.description}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="BunnyCure es un estudio especializado en manicura rusa, esmaltado permanente y cuidado de uñas..."
                  />
                  <Form.Text className="text-muted">Se muestra en la ficha de empresa de WhatsApp Business.</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end">
              <Button type="submit" variant="primary" disabled={savingProfile} className="d-flex align-items-center gap-2">
                {savingProfile ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    <span>Guardando en Meta...</span>
                  </>
                ) : (
                  <>
                    <FiSave />
                    <span>Guardar Perfil en Meta WhatsApp</span>
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* ─── 3. VISOR DE PLANTILLAS META EN TIEMPO REAL ─── */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <FiLayers className="text-primary fs-5" />
            <h5 className="mb-0 fs-6 fw-bold">Plantillas Registradas en Meta ({templates.length})</h5>
          </div>

          <div className="d-flex gap-2">
            <Form.Select
              size="sm"
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              style={{ width: '160px' }}
            >
              <option value="ALL">Todas ({templates.length})</option>
              <option value="UTILITY">Utilidad (Operativas)</option>
              <option value="MARKETING">Marketing</option>
            </Form.Select>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {templates.length === 0 ? (
            <div className="p-4 text-center text-muted small">
              No se detectaron plantillas en la cuenta o falta consultar Meta Graph API.
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Nombre de la Plantilla</th>
                    <th>Categoría</th>
                    <th>Estado Meta</th>
                    <th>Idioma</th>
                    <th>Botones y Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((tpl) => {
                    const buttonsComponent = tpl.components?.find((c) => c.type === 'BUTTONS');
                    const buttons = buttonsComponent?.buttons || [];

                    return (
                      <tr key={tpl.name}>
                        <td>
                          <div className="fw-bold font-monospace text-dark">{tpl.name}</div>
                          {tpl.name === 'recordatorio_cita' && (
                            <span className="small text-muted">Recordatorio 24h / 2h con confirmación y reprogramación</span>
                          )}
                          {tpl.name === 'confirmacion_cita' && (
                            <span className="small text-muted">Aviso de cita confirmada + fidelización</span>
                          )}
                          {tpl.name === 'confirmacion_hora' && (
                            <span className="small text-muted">Alerta interna a especialista / admin</span>
                          )}
                          {tpl.name === 'cancelacion_cita' && (
                            <span className="small text-muted">Aviso de cancelación + enlace a reagendar</span>
                          )}
                          {tpl.name === 'valoracion_servicio_google' && (
                            <span className="small text-muted">Solicitud de reseña en Google Maps</span>
                          )}
                        </td>
                        <td>
                          <Badge bg={tpl.category === 'UTILITY' ? 'info' : 'primary'} className="text-dark fw-semibold">
                            {tpl.category}
                          </Badge>
                        </td>
                        <td>{getTemplateStatusBadge(tpl.status)}</td>
                        <td>
                          <span className="badge bg-light text-dark border font-monospace">{tpl.language}</span>
                        </td>
                        <td>
                          {buttons.length === 0 ? (
                            <span className="text-muted small">Sin botones</span>
                          ) : (
                            <div className="d-flex gap-1 flex-wrap">
                              {buttons.map((btn, idx) => (
                                <Badge key={idx} bg="secondary" className="fw-normal">
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
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};
