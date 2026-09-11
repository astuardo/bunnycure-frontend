import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Spinner,
  Form,
  Modal,
  Alert,
} from 'react-bootstrap';
import {
  FaPaperPlane,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt,
  FaExternalLinkAlt,
  FaUsers,
  FaUserCheck,
  FaUserClock,
  FaCrown,
  FaMobileAlt,
} from 'react-icons/fa';
import DashboardLayout from '../../components/common/DashboardLayout';
import {
  marketingApi,
  MarketingTemplate,
  AudienceType,
  AudiencePreview,
  CampaignDispatchResult,
} from '../../api/marketing.api';
import { useToast } from '../../hooks/useToast';
import './MarketingCampaignsPage.css';

export default function MarketingCampaignsPage() {
  const toast = useToast();

  const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MarketingTemplate | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<AudienceType>('ALL');
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);

  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);

  // Modal de Despacho Masivo
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<CampaignDispatchResult | null>(null);

  // Modal de Envío de Prueba
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhone, setTestPhone] = useState('+569');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Cargar plantillas
  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const data = await marketingApi.getTemplates();
      setTemplates(data);
      if (data.length > 0 && !selectedTemplate) {
        // Seleccionar Fiestas Patrias o Primavera por defecto si estamos en Septiembre
        const defaultTpl =
          data.find((t) => t.name === 'promo_fiestas_patrias') ||
          data.find((t) => t.name === 'promo_bienvenida_primavera') ||
          data[0];
        setSelectedTemplate(defaultTpl);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar plantillas';
      toast.error(msg);
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedTemplate, toast]);

  // Cargar preview de audiencia al cambiar el tipo
  const loadAudiencePreview = useCallback(
    async (type: AudienceType) => {
      setLoadingPreview(true);
      try {
        const preview = await marketingApi.previewAudience(type);
        setAudiencePreview(preview);
      } catch (err: unknown) {
        console.error('Error al cargar audiencia:', err);
      } finally {
        setLoadingPreview(false);
      }
    },
    []
  );

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    loadAudiencePreview(selectedAudience);
  }, [selectedAudience, loadAudiencePreview]);

  // Sincronizar / registrar en Meta
  const handleSyncMeta = async () => {
    setSyncingMeta(true);
    try {
      const res = await marketingApi.syncTemplates();
      const msg = `Sincronización completada. Creadas: ${res.created.length}, Existentes: ${res.alreadyExisted.length}`;
      toast.success(msg);
      await loadTemplates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al sincronizar con Meta';
      toast.error(msg);
    } finally {
      setSyncingMeta(false);
    }
  };

  // Enviar prueba individual
  const handleSendTest = async () => {
    if (!selectedTemplate) return;
    if (!testPhone || testPhone.trim().length < 9) {
      toast.error('Por favor ingresa un número de teléfono válido con código de país (ej: +56912345678)');
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await marketingApi.dispatchCampaign({
        templateName: selectedTemplate.name,
        audienceType: 'ALL',
        testPhoneNumber: testPhone.trim(),
      });

      if (res.sentCount > 0) {
        toast.success(`¡Mensaje de prueba enviado exitosamente a ${testPhone}! Revisa tu WhatsApp.`);
        setShowTestModal(false);
      } else {
        toast.error(res.errorMessages[0] || 'No se pudo entregar el mensaje de prueba');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar prueba';
      toast.error(msg);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Ejecutar campaña masiva
  const handleConfirmDispatch = async () => {
    if (!selectedTemplate) return;

    setIsDispatching(true);
    setDispatchResult(null);
    try {
      const res = await marketingApi.dispatchCampaign({
        templateName: selectedTemplate.name,
        audienceType: selectedAudience,
      });

      setDispatchResult(res);
      toast.success(`Campaña finalizada. Se enviaron ${res.sentCount} mensajes exitosamente.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al ejecutar campaña';
      toast.error(msg);
    } finally {
      setIsDispatching(false);
    }
  };

  // Texto simulado con variable Camila
  const simulatedBodyText = useMemo(() => {
    if (!selectedTemplate) return '';
    return selectedTemplate.bodyText
      .replace(/\{\{1\}\}/g, 'Camila')
      .replace(/\{\{2\}\}/g, 'Esmaltado Permanente');
  }, [selectedTemplate]);

  return (
    <DashboardLayout>
      <Container fluid className="marketing-page-container px-3 px-md-4 py-3">
        {/* Banner Superior */}
        <Card className="marketing-header-card mb-4 p-3 p-md-4">
          <Row className="align-items-center">
            <Col xs={12} lg={8}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <Badge bg="warning" text="dark" className="px-2 py-1">
                  Meta WhatsApp Cloud API
                </Badge>
                <Badge bg="success" className="px-2 py-1">
                  Categoría MARKETING
                </Badge>
              </div>
              <h2 className="mb-2">Campañas de Marketing & Difusión</h2>
              <p className="mb-0 text-white-50">
                Activa el agendamiento en fechas festivas y temporadas de alta demanda en Chile (Fiestas Patrias,
                Primavera, Día de la Madre, Navidad y Año Nuevo).
              </p>
            </Col>
            <Col xs={12} lg={4} className="text-lg-end mt-3 mt-lg-0">
              <Button
                variant="outline-light"
                onClick={handleSyncMeta}
                disabled={syncingMeta}
                className="d-inline-flex align-items-center gap-2 shadow-sm"
              >
                {syncingMeta ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <FaSyncAlt className={syncingMeta ? 'fa-spin' : ''} />
                )}
                Sincronizar Plantillas en Meta
              </Button>
            </Col>
          </Row>
        </Card>

        {loadingTemplates ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Cargando catálogo de campañas...</p>
          </div>
        ) : (
          <Row>
            {/* Columna Izquierda: Configuración de Campaña */}
            <Col xs={12} lg={7} xl={8}>
              {/* Paso 1: Selección de Plantilla */}
              <Card className="border-0 shadow-sm rounded-4 mb-4">
                <Card.Body className="p-3 p-md-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="fw-bold mb-1">1. Selecciona la Ocasión / Festividad</h5>
                      <span className="text-muted small">
                        Elige la plantilla temática con el copy adaptado a la fecha clave
                      </span>
                    </div>
                  </div>

                  <div className="template-grid">
                    {templates.map((tpl) => {
                      const isSelected = selectedTemplate?.name === tpl.name;
                      const isApproved = tpl.metaStatus === 'APPROVED';

                      return (
                        <div
                          key={tpl.name}
                          className={`template-card-select ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedTemplate(tpl)}
                        >
                          <div className="template-card-body">
                            <div className="d-flex justify-content-between align-items-start">
                              <span className="template-emoji-badge">{tpl.emoji}</span>
                              <Badge
                                bg={
                                  isApproved
                                    ? 'success'
                                    : tpl.metaStatus === 'PENDING'
                                    ? 'warning'
                                    : 'secondary'
                                }
                                text={tpl.metaStatus === 'PENDING' ? 'dark' : 'white'}
                                className="small"
                              >
                                {isApproved
                                  ? 'Aprobada en Meta'
                                  : tpl.metaStatus === 'PENDING'
                                  ? 'En revisión'
                                  : 'No registrada'}
                              </Badge>
                            </div>
                            <div className="template-card-title">{tpl.displayName}</div>
                            <div className="template-occasion-badge">{tpl.occasion}</div>
                            <p className="text-muted small mb-0 text-truncate">{tpl.headerText}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card.Body>
              </Card>

              {/* Paso 2: Segmentación de Audiencia */}
              <Card className="border-0 shadow-sm rounded-4 mb-4">
                <Card.Body className="p-3 p-md-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="fw-bold mb-1">2. Segmenta tus Destinatarias</h5>
                      <span className="text-muted small">
                        Filtra las clientas registradas que tienen teléfono y aceptan WhatsApp
                      </span>
                    </div>
                    {loadingPreview && <Spinner animation="border" size="sm" variant="primary" />}
                  </div>

                  <Row>
                    <Col xs={12} sm={6}>
                      <div
                        className={`audience-option-card ${selectedAudience === 'ALL' ? 'selected' : ''}`}
                        onClick={() => setSelectedAudience('ALL')}
                      >
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <FaUsers className="text-primary" />
                          <span className="fw-bold small">Todas las Clientas Registradas</span>
                        </div>
                        <p className="text-muted small mb-0">Base completa con número de WhatsApp válido.</p>
                      </div>
                    </Col>

                    <Col xs={12} sm={6}>
                      <div
                        className={`audience-option-card ${
                          selectedAudience === 'INACTIVE_60_DAYS' ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedAudience('INACTIVE_60_DAYS')}
                      >
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <FaUserClock className="text-warning" />
                          <span className="fw-bold small">Clientas Inactivas (+60 días)</span>
                        </div>
                        <p className="text-muted small mb-0">Sin citas en 60+ días. Ideal para reactivación.</p>
                      </div>
                    </Col>

                    <Col xs={12} sm={6}>
                      <div
                        className={`audience-option-card ${
                          selectedAudience === 'ACTIVE_RECENT' ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedAudience('ACTIVE_RECENT')}
                      >
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <FaUserCheck className="text-success" />
                          <span className="fw-bold small">Clientas Activas Recientes</span>
                        </div>
                        <p className="text-muted small mb-0">Atendidas en los últimos 45 días (cupos prioritarios).</p>
                      </div>
                    </Col>

                    <Col xs={12} sm={6}>
                      <div
                        className={`audience-option-card ${
                          selectedAudience === 'FREQUENT_VIP' ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedAudience('FREQUENT_VIP')}
                      >
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <FaCrown className="text-warning" />
                          <span className="fw-bold small">Clientas Frecuentes / VIP</span>
                        </div>
                        <p className="text-muted small mb-0">Con 3 o más atenciones completadas en salón.</p>
                      </div>
                    </Col>
                  </Row>

                  {/* Resumen de la audiencia */}
                  {audiencePreview && (
                    <div className="bg-light rounded-3 p-3 mt-2 border">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-bold text-dark">
                          🎯 Total estimado de destinatarias:{' '}
                          <Badge bg="primary" className="fs-6 ms-1">
                            {audiencePreview.totalCount} clientas
                          </Badge>
                        </span>
                        <span className="small text-muted">
                          Costo est. Meta: ~${(audiencePreview.totalCount * 0.04).toFixed(2)} USD
                        </span>
                      </div>

                      {audiencePreview.sampleRecipients.length > 0 && (
                        <div className="mt-2">
                          <div className="small text-muted mb-1">Muestra de destinatarias:</div>
                          <div className="d-flex flex-wrap gap-2">
                            {audiencePreview.sampleRecipients.slice(0, 6).map((r) => (
                              <Badge key={r.id} bg="white" text="dark" className="border py-1 px-2 fw-normal">
                                👤 {r.fullName} ({r.maskedPhone})
                              </Badge>
                            ))}
                            {audiencePreview.totalCount > 6 && (
                              <Badge bg="light" text="muted" className="border py-1 px-2 fw-normal">
                                +{audiencePreview.totalCount - 6} más...
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Paso 3: Acciones de Envío */}
              <Card className="border-0 shadow-sm rounded-4 mb-4">
                <Card.Body className="p-3 p-md-4">
                  <h5 className="fw-bold mb-3">3. Acciones de Despacho</h5>
                  <div className="d-flex flex-wrap gap-3">
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowTestModal(true)}
                      className="d-flex align-items-center gap-2 px-3 py-2"
                      disabled={!selectedTemplate}
                    >
                      <FaMobileAlt />
                      Enviar Mensaje de Prueba
                    </Button>

                    <Button
                      variant="success"
                      onClick={() => setShowConfirmModal(true)}
                      className="d-flex align-items-center gap-2 px-4 py-2 fw-semibold shadow-sm"
                      disabled={!selectedTemplate || !audiencePreview || audiencePreview.totalCount === 0}
                    >
                      <FaPaperPlane />
                      Despachar Campaña a {audiencePreview?.totalCount || 0} Clientas
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Columna Derecha: Simulador Visual de WhatsApp */}
            <Col xs={12} lg={5} xl={4}>
              <div className="phone-simulator-wrapper">
                <div className="phone-mockup">
                  <div className="phone-inner-screen">
                    {/* Header WhatsApp */}
                    <div className="wa-header">
                      <div className="wa-avatar">🐰</div>
                      <div className="wa-header-info">
                        <div className="wa-header-name">
                          BunnyCure Studio
                          <FaCheckCircle className="wa-verified-badge" />
                        </div>
                        <div className="wa-header-sub">Cuenta oficial de empresa</div>
                      </div>
                    </div>

                    {/* Chat Area */}
                    <div className="wa-chat-body">
                      {selectedTemplate ? (
                        <div className="wa-bubble">
                          {selectedTemplate.headerText && (
                            <div className="wa-bubble-header">{selectedTemplate.headerText}</div>
                          )}
                          <div className="wa-bubble-text">{simulatedBodyText}</div>
                          <div className="wa-bubble-footer">
                            <span>{selectedTemplate.footerText || 'BunnyCure Studio'}</span>
                            <span className="wa-bubble-time">
                              14:30 <span style={{ color: '#53bdeb' }}>✓✓</span>
                            </span>
                          </div>

                          {selectedTemplate.buttonText && (
                            <div className="wa-bubble-button">
                              <FaExternalLinkAlt size={12} />
                              {selectedTemplate.buttonText}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-muted p-4">
                          Selecciona una plantilla para ver su previsualización
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta Informativa de Meta */}
              <div className="wa-meta-policy-card mt-3 p-3 text-muted">
                <div className="fw-semibold text-dark mb-1">ℹ️ Políticas de Meta WhatsApp</div>
                <ul className="mb-0 ps-3">
                  <li>Las conversaciones de marketing se aprueban automáticamente por Meta.</li>
                  <li>Costo por conversación en Chile: ~$0.035 a $0.05 USD.</li>
                  <li>Solo se contacta a clientas con consentimiento de notificaciones.</li>
                </ul>
              </div>
            </Col>
          </Row>
        )}

        {/* Modal de Envío de Prueba */}
        <Modal show={showTestModal} onHide={() => setShowTestModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title className="fs-6 fw-bold">Enviar Mensaje de Prueba</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted small">
              Recibirás el mensaje con la plantilla <strong>{selectedTemplate?.displayName}</strong> en tu propio
              WhatsApp para revisar cómo se ve antes de enviarlo a las clientas.
            </p>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Número de WhatsApp (con código +56):</Form.Label>
              <Form.Control
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+56912345678"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowTestModal(false)} disabled={isSendingTest}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSendTest} disabled={isSendingTest}>
              {isSendingTest ? <Spinner animation="border" size="sm" className="me-2" /> : <FaPaperPlane className="me-2" />}
              Enviar Prueba
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal de Confirmación y Despacho Masivo */}
        <Modal show={showConfirmModal} onHide={() => !isDispatching && setShowConfirmModal(false)} centered size="lg">
          <Modal.Header closeButton={!isDispatching}>
            <Modal.Title className="fs-5 fw-bold">
              {dispatchResult ? 'Resultado de la Campaña' : 'Confirmar Envío de Campaña'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {!dispatchResult ? (
              <>
                <Alert variant="warning" className="d-flex align-items-start gap-2">
                  <FaExclamationTriangle className="mt-1 flex-shrink-0" />
                  <div>
                    <strong>Atención con el costo y reputación de Meta</strong>
                    <div className="small mt-1">
                      Estás a punto de enviar la plantilla <strong>{selectedTemplate?.displayName}</strong> a{' '}
                      <strong>{audiencePreview?.totalCount || 0} clientas</strong>. Meta cobrará el valor de
                      conversación de marketing por cada entrega (~$
                      {((audiencePreview?.totalCount || 0) * 0.04).toFixed(2)} USD total estimado).
                    </div>
                  </div>
                </Alert>

                <div className="bg-light p-3 rounded-3 mb-3 border">
                  <div className="row g-2 small">
                    <div className="col-sm-6">
                      <span className="text-muted">Plantilla:</span>{' '}
                      <strong>{selectedTemplate?.displayName}</strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted">Festividad:</span>{' '}
                      <strong>{selectedTemplate?.occasion}</strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted">Audiencia:</span>{' '}
                      <strong>{audiencePreview?.audienceDescription}</strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted">Total destinatarias:</span>{' '}
                      <Badge bg="success">{audiencePreview?.totalCount || 0} personas</Badge>
                    </div>
                  </div>
                </div>

                {isDispatching && (
                  <div className="text-center py-3">
                    <Spinner animation="border" variant="success" className="mb-2" />
                    <div className="fw-semibold">Despachando mensajes en ráfagas seguras...</div>
                    <div className="small text-muted">Por favor no cierres esta ventana.</div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <Alert variant={dispatchResult.failedCount === 0 ? 'success' : 'warning'}>
                  <div className="fw-bold mb-1">
                    {dispatchResult.failedCount === 0
                      ? '🎉 ¡Campaña despachada exitosamente!'
                      : '⚠️ Campaña finalizada con algunas advertencias'}
                  </div>
                  <div>
                    Se enviaron correctamente <strong>{dispatchResult.sentCount}</strong> de{' '}
                    <strong>{dispatchResult.totalTargeted}</strong> mensajes.
                  </div>
                </Alert>

                {dispatchResult.errorMessages.length > 0 && (
                  <div className="mt-3">
                    <span className="fw-semibold small text-danger">Detalle de fallas:</span>
                    <ul className="small text-muted mt-1">
                      {dispatchResult.errorMessages.map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            {!dispatchResult ? (
              <>
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isDispatching}
                >
                  Cancelar
                </Button>
                <Button variant="success" onClick={handleConfirmDispatch} disabled={isDispatching}>
                  {isDispatching ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Despachando...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane className="me-2" />
                      Confirmar y Despachar
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  setShowConfirmModal(false);
                  setDispatchResult(null);
                }}
              >
                Entendido
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      </Container>
    </DashboardLayout>
  );
}
