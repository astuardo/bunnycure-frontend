import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  FaBirthdayCake,
  FaEdit,
  FaSearch,
  FaTimes,
} from 'react-icons/fa';
import DashboardLayout from '../../components/common/DashboardLayout';
import {
  marketingApi,
  MarketingTemplate,
  AudienceType,
  AudiencePreview,
  CampaignDispatchResult,
} from '../../api/marketing.api';
import { customersApi } from '../../api/customers.api';
import { Customer } from '../../types/customer.types';
import { useToast } from '../../hooks/useToast';
import './MarketingCampaignsPage.css';

export default function MarketingCampaignsPage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MarketingTemplate | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<AudienceType>('ALL');
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);

  // Selección manual de clientas específicas
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Parámetro dinámico para {{2}} (Beneficio / Servicio / Oferta)
  const [customBenefit, setCustomBenefit] = useState('');

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

  // Modal de Edición de Plantilla en Meta
  const [showEditMetaModal, setShowEditMetaModal] = useState(false);
  const [editHeaderText, setEditHeaderText] = useState('');
  const [editBodyText, setEditBodyText] = useState('');
  const [editFooterText, setEditFooterText] = useState('');
  const [editButtonText, setEditButtonText] = useState('');
  const [editButtonUrl, setEditButtonUrl] = useState('');
  const [isSavingMeta, setIsSavingMeta] = useState(false);

  // Inicializar parámetro dinámico según la plantilla
  const initBenefit = (tpl: MarketingTemplate) => {
    if (tpl.name === 'saludo_cumpleanos_bunnycure') {
      setCustomBenefit('un 15% de descuento exclusivo en tu próxima cita');
    } else if (tpl.name === 'bunnycure_reactivacion_clienta') {
      setCustomBenefit('Manicura Rusa / Permanente');
    } else {
      setCustomBenefit('');
    }
  };

  const handleSelectTemplate = (tpl: MarketingTemplate) => {
    setSelectedTemplate(tpl);
    initBenefit(tpl);
  };

  // Cargar plantillas y leer query params
  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const data = await marketingApi.getTemplates();
      setTemplates(data);

      const tplParam = searchParams.get('template');
      const audParam = searchParams.get('audience') as AudienceType | null;

      if (data.length > 0) {
        let chosen = data[0];
        if (tplParam) {
          const match = data.find((t) => t.name.toLowerCase() === tplParam.toLowerCase());
          if (match) chosen = match;
        } else {
          chosen =
            data.find((t) => t.name === 'promo_fiestas_patrias') ||
            data.find((t) => t.name === 'promo_bienvenida_primavera') ||
            data[0];
        }
        setSelectedTemplate(chosen);
        initBenefit(chosen);
      }

      if (audParam) {
        setSelectedAudience(audParam);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar plantillas';
      toast.error(msg);
    } finally {
      setLoadingTemplates(false);
    }
  }, [searchParams, toast]);

  // Cargar lista completa de clientas para el selector manual
  useEffect(() => {
    if (selectedAudience === 'SPECIFIC_CUSTOMERS' && allCustomers.length === 0 && !loadingCustomers) {
      setLoadingCustomers(true);
      customersApi
        .list()
        .then((data) => {
          setAllCustomers(data);
        })
        .catch((err) => {
          console.error('Error al cargar clientes:', err);
          toast.error('Error al cargar la lista de clientas');
        })
        .finally(() => {
          setLoadingCustomers(false);
        });
    }
  }, [selectedAudience, allCustomers.length, loadingCustomers, toast]);

  // Cargar preview de audiencia al cambiar el tipo o clientes seleccionados
  const loadAudiencePreview = useCallback(
    async (type: AudienceType, customerIds?: number[]) => {
      setLoadingPreview(true);
      try {
        const preview = await marketingApi.previewAudience(type, customerIds);
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
    if (selectedAudience === 'SPECIFIC_CUSTOMERS') {
      loadAudiencePreview('SPECIFIC_CUSTOMERS', selectedCustomerIds);
    } else {
      loadAudiencePreview(selectedAudience);
    }
  }, [selectedAudience, selectedCustomerIds, loadAudiencePreview]);

  // Clientas filtradas por el buscador
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return allCustomers;
    const q = customerSearch.toLowerCase().trim();
    return allCustomers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        String(c.id).includes(q)
    );
  }, [allCustomers, customerSearch]);

  // Detalles de clientas seleccionadas
  const selectedCustomersDetails = useMemo(() => {
    const map = new Map(allCustomers.map((c) => [c.id, c]));
    return selectedCustomerIds
      .map((id) => map.get(id))
      .filter((c): c is Customer => Boolean(c));
  }, [allCustomers, selectedCustomerIds]);

  const toggleCustomerSelection = (customerId: number) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId]
    );
  };

  const handleSelectAllFiltered = () => {
    const eligibleFilteredIds = filteredCustomers
      .filter((c) => c.phone && c.phone.trim().length > 0)
      .map((c) => c.id);
    setSelectedCustomerIds((prev) => Array.from(new Set([...prev, ...eligibleFilteredIds])));
  };

  const handleDeselectAll = () => {
    setSelectedCustomerIds([]);
  };

  const handleRemoveCustomerChip = (customerId: number) => {
    setSelectedCustomerIds((prev) => prev.filter((id) => id !== customerId));
  };

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
        customBenefit: customBenefit.trim() || undefined,
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

  // Ejecutar campaña masiva o a clientas específicas
  const handleConfirmDispatch = async () => {
    if (!selectedTemplate) return;

    if (selectedAudience === 'SPECIFIC_CUSTOMERS' && selectedCustomerIds.length === 0) {
      toast.error('Debes seleccionar al menos una clienta para realizar el envío');
      return;
    }

    setIsDispatching(true);
    setDispatchResult(null);
    try {
      const res = await marketingApi.dispatchCampaign({
        templateName: selectedTemplate.name,
        audienceType: selectedAudience,
        customBenefit: customBenefit.trim() || undefined,
        customerIds: selectedAudience === 'SPECIFIC_CUSTOMERS' ? selectedCustomerIds : undefined,
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

  // Abrir editor de plantilla en Meta
  const handleOpenEditMeta = () => {
    if (!selectedTemplate) return;
    setEditHeaderText(selectedTemplate.headerText || '');
    setEditBodyText(selectedTemplate.bodyText || '');
    setEditFooterText(selectedTemplate.footerText || '');
    setEditButtonText(selectedTemplate.buttonText || '');
    setEditButtonUrl(selectedTemplate.buttonUrl || '');
    setShowEditMetaModal(true);
  };

  // Guardar edición de plantilla en Meta
  const handleSaveMetaTemplate = async () => {
    if (!selectedTemplate) return;
    if (!editBodyText.trim()) {
      toast.error('El cuerpo de la plantilla no puede estar vacío');
      return;
    }

    setIsSavingMeta(true);
    try {
      const updated = await marketingApi.updateTemplate(selectedTemplate.name, {
        headerText: editHeaderText.trim() || undefined,
        bodyText: editBodyText.trim(),
        footerText: editFooterText.trim() || undefined,
        buttonText: editButtonText.trim() || undefined,
        buttonUrl: editButtonUrl.trim() || undefined,
      });
      toast.success(`Plantilla '${selectedTemplate.displayName}' actualizada en Meta. Pasó a revisión automática.`);
      setShowEditMetaModal(false);
      await loadTemplates();
      setSelectedTemplate(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar plantilla en Meta';
      toast.error(msg);
    } finally {
      setIsSavingMeta(false);
    }
  };

  // Texto simulado con variable Camila y parámetro personalizado
  const simulatedBodyText = useMemo(() => {
    if (!selectedTemplate) return '';
    const benefit =
      customBenefit.trim() ||
      (selectedTemplate.name === 'saludo_cumpleanos_bunnycure'
        ? 'un 15% de descuento exclusivo en tu próxima cita'
        : 'Esmaltado Permanente');

    return selectedTemplate.bodyText
      .replace(/\{\{1\}\}/g, 'Camila')
      .replace(/\{\{2\}\}/g, benefit);
  }, [selectedTemplate, customBenefit]);

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
                Activa el agendamiento en fechas festivas chilenas (Fiestas Patrias, Primavera, Día de la Madre, Navidad,
                Año Nuevo), cumpleaños de clientas y reactivación de clientas inactivas.
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
            <p className="mt-3 text-muted">Cargando catálogo y sincronizando estado con Meta Graph API...</p>
          </div>
        ) : (
          <Row className="g-4">
            {/* Columna Izquierda: Selección de Plantilla y Audiencia */}
            <Col xs={12} lg={7} xl={8}>
              {/* Paso 1: Catálogo de Campañas */}
              <Card className="border-0 shadow-sm rounded-4 mb-4">
                <Card.Body className="p-3 p-md-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="fw-bold mb-1">1. Selecciona la Campaña o Festividad</h5>
                      <span className="text-muted small">
                        Plantillas optimizadas para conversión con botones de llamado a la acción
                      </span>
                    </div>
                    <Badge bg="light" text="dark" className="border">
                      {templates.length} Plantillas
                    </Badge>
                  </div>

                  <div className="template-grid">
                    {templates.map((tpl) => {
                      const isSelected = selectedTemplate?.name === tpl.name;
                      const isApproved = tpl.metaStatus === 'APPROVED';

                      return (
                        <div
                          key={tpl.name}
                          className={`template-card-select ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectTemplate(tpl)}
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
                        Filtra las clientas registradas que tienen teléfono válido y aceptan WhatsApp
                      </span>
                    </div>
                    {loadingPreview && <Spinner animation="border" size="sm" variant="primary" />}
                  </div>

                  <Row className="g-2 mb-3">
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
                          selectedAudience === 'INACTIVE_30_DAYS' ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedAudience('INACTIVE_30_DAYS')}
                      >
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <FaUserClock className="text-warning" />
                          <span className="fw-bold small">Clientas Inactivas (+30 días)</span>
                        </div>
                        <p className="text-muted small mb-0">Sin citas en 30+ días. Reactivación oportuna.</p>
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
                          <FaUserClock className="text-danger" />
                          <span className="fw-bold small">Clientas Inactivas (+60 días)</span>
                        </div>
                        <p className="text-muted small mb-0">Sin citas en 60+ días. Alto riesgo de pérdida.</p>
                      </div>
                    </Col>

                    <Col xs={12} sm={6}>
                      <div
                        className={`audience-option-card ${
                          selectedAudience === 'BIRTHDAYS_THIS_MONTH' ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedAudience('BIRTHDAYS_THIS_MONTH')}
                      >
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <FaBirthdayCake className="text-warning" />
                          <span className="fw-bold small">Cumpleañeras de Este Mes 🎂</span>
                        </div>
                        <p className="text-muted small mb-0">Clientas con cumpleaños en el mes actual.</p>
                      </div>
                    </Col>

                    <Col xs={12} sm={6}>
                      <div
                        className={`audience-option-card ${
                          selectedAudience === 'BIRTHDAYS_TODAY' ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedAudience('BIRTHDAYS_TODAY')}
                      >
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <FaBirthdayCake className="text-danger" />
                          <span className="fw-bold small">¡Cumplen Años Hoy! 🎉</span>
                        </div>
                        <p className="text-muted small mb-0">Clientas que cumplen años exactamente hoy.</p>
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

                    <Col xs={12} sm={6}>
                      <div
                        className={`audience-option-card ${
                          selectedAudience === 'SPECIFIC_CUSTOMERS' ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedAudience('SPECIFIC_CUSTOMERS')}
                      >
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <FaUserCheck className="text-info" />
                          <span className="fw-bold small">Clientas Específicas 🎯</span>
                        </div>
                        <p className="text-muted small mb-0">Selección manual de una o varias clientas puntuales.</p>
                      </div>
                    </Col>
                  </Row>

                  {/* Panel Interactivo de Selección de Clientas Específicas */}
                  {selectedAudience === 'SPECIFIC_CUSTOMERS' && (
                    <div className="specific-customers-panel p-3 mb-3 rounded-3 border bg-white shadow-sm">
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                        <div>
                          <h6 className="fw-bold mb-1 d-flex align-items-center gap-2 text-dark">
                            <FaUsers className="text-primary" /> Seleccionar Clientas ({selectedCustomerIds.length} seleccionada{selectedCustomerIds.length === 1 ? '' : 's'})
                          </h6>
                          <span className="text-muted small">
                            Busca por nombre o teléfono y marca las clientas que recibirán este WhatsApp.
                          </span>
                        </div>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={handleSelectAllFiltered}
                            disabled={loadingCustomers || filteredCustomers.length === 0}
                          >
                            Seleccionar todas ({filteredCustomers.filter((c) => c.phone && c.phone.trim().length >= 8).length})
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={handleDeselectAll}
                            disabled={selectedCustomerIds.length === 0}
                          >
                            Limpiar
                          </Button>
                        </div>
                      </div>

                      {/* Buscador de Clientas */}
                      <div className="position-relative mb-3">
                        <Form.Control
                          type="text"
                          placeholder="Buscar clienta por nombre o teléfono..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="ps-5"
                          style={{ borderRadius: '10px' }}
                        />
                        <FaSearch
                          className="position-absolute text-muted"
                          style={{ top: '50%', left: '16px', transform: 'translateY(-50%)' }}
                        />
                        {customerSearch && (
                          <Button
                            variant="link"
                            className="position-absolute text-muted p-0"
                            style={{ top: '50%', right: '14px', transform: 'translateY(-50%)' }}
                            onClick={() => setCustomerSearch('')}
                          >
                            <FaTimes />
                          </Button>
                        )}
                      </div>

                      {/* Chips de Seleccionadas */}
                      {selectedCustomerIds.length > 0 && (
                        <div className="mb-3 p-2 rounded-2 bg-light border">
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="small fw-semibold text-secondary">
                              Clientas seleccionadas ({selectedCustomerIds.length}):
                            </span>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 text-danger text-decoration-none small"
                              style={{ fontSize: '11px' }}
                              onClick={handleDeselectAll}
                            >
                              Quitar todas
                            </Button>
                          </div>
                          <div className="d-flex flex-wrap gap-1" style={{ maxHeight: '90px', overflowY: 'auto' }}>
                            {selectedCustomersDetails.map((c) => (
                              <Badge
                                key={c.id}
                                bg="white"
                                text="dark"
                                className="border d-inline-flex align-items-center gap-1 py-1 px-2 fw-normal"
                              >
                                <span>{c.fullName}</span>
                                <span className="text-muted" style={{ fontSize: '10px' }}>
                                  ({c.phone || 'S/T'})
                                </span>
                                <span
                                  style={{ cursor: 'pointer', marginLeft: '3px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveCustomerChip(c.id);
                                  }}
                                  title="Quitar"
                                >
                                  ×
                                </span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lista de Clientas con Casillas */}
                      {loadingCustomers ? (
                        <div className="text-center py-4">
                          <Spinner animation="border" size="sm" variant="primary" />
                          <span className="ms-2 text-muted small">Cargando base de clientas...</span>
                        </div>
                      ) : (
                        <div
                          className="customer-selection-list border rounded-2"
                          style={{ maxHeight: '260px', overflowY: 'auto' }}
                        >
                          {filteredCustomers.length === 0 ? (
                            <div className="text-center py-4 text-muted small">
                              No se encontraron clientas con el criterio "{customerSearch}".
                            </div>
                          ) : (
                            filteredCustomers.map((c) => {
                              const isSelected = selectedCustomerIds.includes(c.id);
                              const hasPhone = Boolean(c.phone && c.phone.trim().length >= 8);

                              return (
                                <div
                                  key={c.id}
                                  className={`customer-select-item p-2 px-3 d-flex align-items-center justify-content-between border-bottom ${
                                    isSelected ? 'bg-light-success' : ''
                                  } ${!hasPhone ? 'opacity-50' : ''}`}
                                  style={{
                                    cursor: hasPhone ? 'pointer' : 'not-allowed',
                                    transition: 'background 0.15s',
                                  }}
                                  onClick={() => {
                                    if (hasPhone) toggleCustomerSelection(c.id);
                                  }}
                                >
                                  <div className="d-flex align-items-center gap-3">
                                    <Form.Check
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={!hasPhone}
                                      onChange={() => {}}
                                      className="m-0 pointer"
                                    />
                                    <div>
                                      <div className="fw-semibold small text-dark">{c.fullName}</div>
                                      <div className="text-muted" style={{ fontSize: '12px' }}>
                                        {hasPhone ? (
                                          <span>📱 {c.phone}</span>
                                        ) : (
                                          <span className="text-danger">⚠️ Sin número de WhatsApp válido</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-end">
                                    <Badge bg="light" text="dark" className="border fw-normal small">
                                      {c.totalCompletedVisits || 0} visitas
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}

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

              {/* Personalización de Parámetros Dinámicos ({{2}}) */}
              {selectedTemplate && selectedTemplate.bodyText.includes('{{2}}') && (
                <Card className="border-0 shadow-sm rounded-4 mb-4" style={{ background: '#fff9f8', border: '1px solid #eed0c5' }}>
                  <Card.Body className="p-3 p-md-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="fw-bold mb-0" style={{ color: '#422314' }}>
                        ✏️ Beneficio o Parámetro Personalizado ({'{{2}}'})
                      </h6>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 text-decoration-none"
                        style={{ color: '#8c2a3e', fontSize: '12px' }}
                        onClick={() => initBenefit(selectedTemplate)}
                      >
                        Restablecer por defecto
                      </Button>
                    </div>
                    <p className="text-muted small mb-2">
                      Puedes cambiar el beneficio, oferta o servicio que se enviará en la plantilla sin requerir re-aprobación de Meta.
                    </p>
                    <Form.Control
                      type="text"
                      value={customBenefit}
                      onChange={(e) => setCustomBenefit(e.target.value)}
                      placeholder="Ej: un 20% de descuento exclusivo en tu próxima cita"
                      style={{ borderRadius: '10px', borderColor: '#eed0c5' }}
                    />
                  </Card.Body>
                </Card>
              )}

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
                      disabled={
                        !selectedTemplate ||
                        !audiencePreview ||
                        audiencePreview.totalCount === 0 ||
                        (selectedAudience === 'SPECIFIC_CUSTOMERS' && selectedCustomerIds.length === 0)
                      }
                    >
                      <FaPaperPlane />
                      {selectedAudience === 'SPECIFIC_CUSTOMERS'
                        ? `Enviar a ${selectedCustomerIds.length} Clienta${selectedCustomerIds.length === 1 ? '' : 's'} Seleccionada${selectedCustomerIds.length === 1 ? '' : 's'}`
                        : `Despachar Campaña a ${audiencePreview?.totalCount || 0} Clientas`}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Columna Derecha: Simulador Visual de WhatsApp */}
            <Col xs={12} lg={5} xl={4}>
              <div className="phone-simulator-wrapper">
                {/* Cabecera con botón de edición en Meta */}
                {selectedTemplate && (
                  <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                    <span className="small fw-semibold text-muted">Vista Previa en Smartphone:</span>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={handleOpenEditMeta}
                      className="d-inline-flex align-items-center gap-1"
                      style={{ borderRadius: '8px', fontSize: '11px', padding: '3px 8px' }}
                      title="Editar el texto base oficial registrado en Meta Graph API"
                    >
                      <FaEdit /> Editar Texto en Meta
                    </Button>
                  </div>
                )}

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
                <ul className="mb-0 ps-3 small">
                  <li>Las variables dinámicas (como nombres o beneficios) no requieren aprobación previa.</li>
                  <li>Si editas el texto base de la plantilla en Meta, pasará a revisión automática (pocos minutos).</li>
                  <li>Costo por conversación en Chile: ~$0.035 a $0.05 USD.</li>
                  <li>Solo se contacta a clientas con consentimiento de notificaciones activo.</li>
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
            {customBenefit && (
              <Alert variant="info" className="py-2 px-3 small mb-0">
                <strong>Parámetro personalizado ({'{{2}}'}):</strong> {customBenefit}
              </Alert>
            )}
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
                    {selectedAudience === 'SPECIFIC_CUSTOMERS' && selectedCustomersDetails.length > 0 && (
                      <div className="col-12 mt-2 pt-2 border-top">
                        <span className="text-muted small">Destinatarias seleccionadas ({selectedCustomersDetails.length}):</span>
                        <div className="d-flex flex-wrap gap-1 mt-1" style={{ maxHeight: '80px', overflowY: 'auto' }}>
                          {selectedCustomersDetails.map((c) => (
                            <Badge key={c.id} bg="white" text="dark" className="border py-1 px-2 fw-normal small">
                              👤 {c.fullName} ({c.phone || 'S/T'})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {customBenefit && (
                      <div className="col-12 mt-2 pt-2 border-top">
                        <span className="text-muted">Beneficio ({'{{2}}'}):</span>{' '}
                        <strong className="text-primary">{customBenefit}</strong>
                      </div>
                    )}
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

        {/* Modal para Editar Plantilla Oficial en Meta */}
        <Modal show={showEditMetaModal} onHide={() => !isSavingMeta && setShowEditMetaModal(false)} centered size="lg">
          <Modal.Header closeButton={!isSavingMeta}>
            <Modal.Title className="fs-6 fw-bold">
              ✏️ Editar Plantilla Oficial en Meta Graph API &bull; {selectedTemplate?.displayName}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="warning" className="small py-2 px-3 mb-3">
              <strong>Nota sobre aprobación de Meta:</strong> Al actualizar el texto base oficial, Meta evaluará
              automáticamente los cambios. La plantilla pasará temporalmente a estado <strong>En revisión (PENDING)</strong>{' '}
              durante algunos minutos hasta su re-aprobación.
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Encabezado (Texto plano, sin emojis según reglas de Meta):</Form.Label>
              <Form.Control
                type="text"
                value={editHeaderText}
                onChange={(e) => setEditHeaderText(e.target.value)}
                placeholder="Ej: Celebra con BunnyCure"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Cuerpo del Mensaje (Soporta emojis, *negrita* y variables {'{{1}}'}, {'{{2}}'}):</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                value={editBodyText}
                onChange={(e) => setEditBodyText(e.target.value)}
                style={{ fontSize: '13.5px' }}
              />
              <Form.Text className="text-muted small">
                Mantén las variables numéricas como <code>{`{{1}}`}</code> (nombre de la clienta) para que la personalización funcione.
              </Form.Text>
            </Form.Group>

            <Row className="g-2 mb-3">
              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Texto de Pie (Footer):</Form.Label>
                  <Form.Control
                    type="text"
                    value={editFooterText}
                    onChange={(e) => setEditFooterText(e.target.value)}
                    placeholder="BunnyCure Studio"
                  />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Texto del Botón CTA (Sin emojis):</Form.Label>
                  <Form.Control
                    type="text"
                    value={editButtonText}
                    onChange={(e) => setEditButtonText(e.target.value)}
                    placeholder="Reservar mi hora"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-2">
              <Form.Label className="small fw-semibold">URL de Destino del Botón:</Form.Label>
              <Form.Control
                type="text"
                value={editButtonUrl}
                onChange={(e) => setEditButtonUrl(e.target.value)}
                placeholder="https://reservar.bunnycure.cl"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowEditMetaModal(false)} disabled={isSavingMeta}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveMetaTemplate} disabled={isSavingMeta}>
              {isSavingMeta ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" /> Guardando en Meta...
                </>
              ) : (
                'Guardar y Enviar a Revisión en Meta'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </DashboardLayout>
  );
}
