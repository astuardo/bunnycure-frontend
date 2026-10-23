import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  FaMagic,
  FaTrash,
} from 'react-icons/fa';
import DashboardLayout from '../../components/common/DashboardLayout';
import {
  marketingApi,
  type MarketingTemplate,
  type AudienceType,
  type AudiencePreview,
  type CampaignDispatchResult,
} from '../../api/marketing.api';
import { customersApi } from '../../api/customers.api';
import type { Customer } from '../../types/customer.types';
import { useToast } from '../../hooks/useToast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
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

  // Modal y generación con Agente IA
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiStep, setAiStep] = useState<'PROMPT' | 'REVIEW'>('PROMPT');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAutoRegister, setAiAutoRegister] = useState(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSavingApproved, setIsSavingApproved] = useState(false);

  // Estados del borrador de IA para revisión y visto bueno
  const [draftName, setDraftName] = useState('');
  const [draftDisplayName, setDraftDisplayName] = useState('');
  const [draftOccasion, setDraftOccasion] = useState('');
  const [draftEmoji, setDraftEmoji] = useState('💅');
  const [draftHeaderText, setDraftHeaderText] = useState('');
  const [draftBodyText, setDraftBodyText] = useState('');
  const [draftFooterText, setDraftFooterText] = useState('BunnyCure Studio');
  const [draftButtonText, setDraftButtonText] = useState('Reservar mi cita');
  const [draftButtonUrl, setDraftButtonUrl] = useState('https://reservar.bunnycure.cl');

  // Parámetro dinámico para {{2}} (Beneficio / Servicio / Oferta)
  const [customBenefit, setCustomBenefit] = useState('');

  const [loadingTemplates, setLoadingTemplates] = useState(true);
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

  // Modal de Eliminación de Plantilla
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<MarketingTemplate | null>(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);

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
      let isMounted = true;
      void (async () => {
        setLoadingCustomers(true);
        try {
          const data = await customersApi.listAll();
          if (isMounted) {
            setAllCustomers(data);
          }
        } catch (err) {
          console.error('Error al cargar clientes:', err);
          toast.error('Error al cargar la lista de clientas');
        } finally {
          if (isMounted) {
            setLoadingCustomers(false);
          }
        }
      })();
      return () => {
        isMounted = false;
      };
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
    void (async () => {
      await loadTemplates();
    })();
  }, [loadTemplates]);

  useEffect(() => {
    void (async () => {
      if (selectedAudience === 'SPECIFIC_CUSTOMERS') {
        await loadAudiencePreview('SPECIFIC_CUSTOMERS', selectedCustomerIds);
      } else {
        await loadAudiencePreview(selectedAudience);
      }
    })();
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

  // Eliminar plantilla en Meta y Catálogo
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setIsDeletingTemplate(true);
    try {
      await marketingApi.deleteTemplate(templateToDelete.name);
      toast.success(`Plantilla "${templateToDelete.displayName}" eliminada de Meta y del catálogo.`);
      setShowDeleteModal(false);
      const deletedName = templateToDelete.name;
      setTemplateToDelete(null);

      const data = await marketingApi.getTemplates();
      setTemplates(data);
      if (selectedTemplate?.name === deletedName) {
        if (data.length > 0) {
          setSelectedTemplate(data[0]);
          initBenefit(data[0]);
        } else {
          setSelectedTemplate(null);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la plantilla';
      toast.error(msg);
    } finally {
      setIsDeletingTemplate(false);
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

  // Abrir modal de Agente IA en paso 1
  const handleOpenAiModal = () => {
    setAiStep('PROMPT');
    setAiPrompt('');
    setIsGeneratingAi(false);
    setIsSavingApproved(false);
    setShowAiModal(true);
  };

  // Generar borrador / propuesta con Agente IA para revisión previa
  const handleGenerateAiDraft = async (promptOverride?: string) => {
    const promptToUse = (promptOverride || aiPrompt).trim();
    if (!promptToUse) {
      toast.error('Por favor escribe una descripción o selecciona una idea sugerida');
      return;
    }
    setIsGeneratingAi(true);
    try {
      const draft = await marketingApi.generateAiDraft(promptToUse);
      setDraftName(draft.name);
      setDraftDisplayName(draft.displayName);
      setDraftOccasion(draft.occasion || 'Promoción Especial');
      setDraftEmoji(draft.emoji || '💅');
      setDraftHeaderText(draft.headerText || '');
      setDraftBodyText(draft.bodyText);
      setDraftFooterText(draft.footerText || 'BunnyCure Studio');
      setDraftButtonText(draft.buttonText || 'Reservar mi cita');
      setDraftButtonUrl(draft.buttonUrl || 'https://reservar.bunnycure.cl');
      setAiStep('REVIEW');
      toast.info('✨ Propuesta generada por IA. Revisa, edita o ajusta el mensaje antes de dar tu visto bueno.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al generar propuesta con el Agente IA';
      toast.error(msg);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Guardar plantilla aprobada con visto bueno del usuario
  const handleSaveApproved = async () => {
    if (!draftDisplayName.trim()) {
      toast.error('Por favor ingresa un nombre para la campaña');
      return;
    }
    if (!draftBodyText.trim()) {
      toast.error('El cuerpo del mensaje no puede estar vacío');
      return;
    }
    setIsSavingApproved(true);
    try {
      const saved = await marketingApi.saveApprovedTemplate({
        name: draftName.trim(),
        displayName: draftDisplayName.trim(),
        occasion: draftOccasion.trim(),
        emoji: draftEmoji.trim(),
        headerText: draftHeaderText.trim(),
        bodyText: draftBodyText.trim(),
        footerText: draftFooterText.trim(),
        buttonText: draftButtonText.trim(),
        buttonUrl: draftButtonUrl.trim(),
        sampleVariables: ['Camila'],
        autoRegisterInMeta: aiAutoRegister,
      });

      toast.success(`¡Plantilla "${saved.displayName}" aprobada y guardada con éxito!`);
      await loadTemplates();
      setSelectedTemplate(saved);
      setShowAiModal(false);
      setAiStep('PROMPT');
      setAiPrompt('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la plantilla aprobada';
      toast.error(msg);
    } finally {
      setIsSavingApproved(false);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 marketing-page-container">
        {/* Banner Superior */}
        <div className="marketing-header-card p-6 md:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400 text-stone-900">
                Meta WhatsApp Cloud API
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500 text-white">
                Categoría MARKETING
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Campañas de Marketing & Difusión</h2>
            <p className="text-rose-100/80 text-sm leading-relaxed">
              Activa el agendamiento en fechas festivas chilenas (Fiestas Patrias, Primavera, Día de la Madre, Navidad,
              Año Nuevo), cumpleaños de clientas y reactivación de clientas inactivas.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={handleOpenAiModal}
              leftIcon={<FaMagic className="text-purple-600" />}
              className="bg-white text-purple-700 hover:bg-purple-50 border-white shadow-sm font-semibold"
            >
              Crear con Agente IA
            </Button>
            <Button
              variant="outline"
              onClick={handleSyncMeta}
              disabled={syncingMeta}
              isLoading={syncingMeta}
              leftIcon={!syncingMeta ? <FaSyncAlt /> : undefined}
              className="text-white border-white/40 hover:bg-white/10"
            >
              Sincronizar Plantillas en Meta
            </Button>
          </div>
        </div>

        {loadingTemplates ? (
          <div className="text-center py-16">
            <Spinner size="lg" variant="primary" />
            <p className="mt-3 text-stone-400 text-sm">Cargando catálogo y sincronizando estado con Meta Graph API...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda: Selección de Plantilla y Audiencia */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {/* Paso 1: Catálogo de Campañas */}
              <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 md:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h5 className="font-bold text-amber-950 text-base">1. Selecciona la Campaña o Festividad</h5>
                    <span className="text-stone-400 text-xs">
                      Plantillas optimizadas para conversión con botones de llamado a la acción
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenAiModal}
                      leftIcon={<FaMagic className="text-purple-600" />}
                    >
                      Nueva con IA
                    </Button>
                    <Badge variant="neutral">
                      {templates.length} Plantillas
                    </Badge>
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
                        onClick={() => handleSelectTemplate(tpl)}
                      >
                        <div className="template-card-body">
                          <div className="flex justify-between items-start">
                            <span className="template-emoji-badge">{tpl.emoji}</span>
                            <div className="flex items-center gap-1">
                              <Badge
                                variant={
                                  isApproved
                                    ? 'success'
                                    : tpl.metaStatus === 'PENDING'
                                    ? 'warning'
                                    : 'neutral'
                                }
                              >
                                {isApproved
                                  ? 'Aprobada en Meta'
                                  : tpl.metaStatus === 'PENDING'
                                  ? 'En revisión'
                                  : 'No registrada'}
                              </Badge>
                              <button
                                type="button"
                                className="p-1 text-red-400 hover:text-red-600 transition-colors ml-1"
                                title="Eliminar plantilla de Meta y catálogo"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTemplateToDelete(tpl);
                                  setShowDeleteModal(true);
                                }}
                              >
                                <FaTrash size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="template-card-title">{tpl.displayName}</div>
                          <div className="template-occasion-badge">{tpl.occasion}</div>
                          <p className="text-stone-400 text-xs truncate mb-0">{tpl.headerText}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Paso 2: Segmentación de Audiencia */}
              <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 md:p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-amber-950 text-base">2. Segmenta tus Destinatarias</h5>
                    <span className="text-stone-400 text-xs">
                      Filtra las clientas registradas que tienen teléfono válido y aceptan WhatsApp
                    </span>
                  </div>
                  {loadingPreview && <Spinner size="sm" />}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div
                      className={`audience-option-card ${selectedAudience === 'ALL' ? 'selected' : ''}`}
                      onClick={() => setSelectedAudience('ALL')}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FaUsers className="text-blue-600" />
                        <span className="font-bold text-xs text-stone-800">Todas las Clientas Registradas</span>
                      </div>
                      <p className="text-stone-500 text-xs mb-0">Base completa con número de WhatsApp válido.</p>
                    </div>
                  </div>

                  <div>
                    <div
                      className={`audience-option-card ${
                        selectedAudience === 'INACTIVE_30_DAYS' ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedAudience('INACTIVE_30_DAYS')}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FaUserClock className="text-amber-500" />
                        <span className="font-bold text-xs text-stone-800">Clientas Inactivas (+30 días)</span>
                      </div>
                      <p className="text-stone-500 text-xs mb-0">Sin citas en 30+ días. Reactivación oportuna.</p>
                    </div>
                  </div>

                  <div>
                    <div
                      className={`audience-option-card ${
                        selectedAudience === 'INACTIVE_60_DAYS' ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedAudience('INACTIVE_60_DAYS')}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FaUserClock className="text-red-500" />
                        <span className="font-bold text-xs text-stone-800">Clientas Inactivas (+60 días)</span>
                      </div>
                      <p className="text-stone-500 text-xs mb-0">Sin citas en 60+ días. Alto riesgo de pérdida.</p>
                    </div>
                  </div>

                  <div>
                    <div
                      className={`audience-option-card ${
                        selectedAudience === 'BIRTHDAYS_THIS_MONTH' ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedAudience('BIRTHDAYS_THIS_MONTH')}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FaBirthdayCake className="text-amber-500" />
                        <span className="font-bold text-xs text-stone-800">Cumpleañeras de Este Mes 🎂</span>
                      </div>
                      <p className="text-stone-500 text-xs mb-0">Clientas con cumpleaños en el mes actual.</p>
                    </div>
                  </div>

                  <div>
                    <div
                      className={`audience-option-card ${
                        selectedAudience === 'BIRTHDAYS_TODAY' ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedAudience('BIRTHDAYS_TODAY')}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FaBirthdayCake className="text-rose-600" />
                        <span className="font-bold text-xs text-stone-800">¡Cumplen Años Hoy! 🎉</span>
                      </div>
                      <p className="text-stone-500 text-xs mb-0">Clientas que cumplen años exactamente hoy.</p>
                    </div>
                  </div>

                  <div>
                    <div
                      className={`audience-option-card ${
                        selectedAudience === 'ACTIVE_RECENT' ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedAudience('ACTIVE_RECENT')}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FaUserCheck className="text-emerald-600" />
                        <span className="font-bold text-xs text-stone-800">Clientas Activas Recientes</span>
                      </div>
                      <p className="text-stone-500 text-xs mb-0">Atendidas en los últimos 45 días (cupos prioritarios).</p>
                    </div>
                  </div>

                  <div>
                    <div
                      className={`audience-option-card ${
                        selectedAudience === 'FREQUENT_VIP' ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedAudience('FREQUENT_VIP')}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FaCrown className="text-amber-500" />
                        <span className="font-bold text-xs text-stone-800">Clientas Frecuentes / VIP</span>
                      </div>
                      <p className="text-stone-500 text-xs mb-0">Con 3 o más atenciones completadas en salón.</p>
                    </div>
                  </div>

                  <div>
                    <div
                      className={`audience-option-card ${
                        selectedAudience === 'SPECIFIC_CUSTOMERS' ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedAudience('SPECIFIC_CUSTOMERS')}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FaUserCheck className="text-sky-600" />
                        <span className="font-bold text-xs text-stone-800">Clientas Específicas 🎯</span>
                      </div>
                      <p className="text-stone-500 text-xs mb-0">Selección manual de una o varias clientas puntuales.</p>
                    </div>
                  </div>
                </div>

                {/* Panel Interactivo de Selección de Clientas Específicas */}
                {selectedAudience === 'SPECIFIC_CUSTOMERS' && (
                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div>
                        <h6 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                          <FaUsers className="text-rose-700" /> Seleccionar Clientas ({selectedCustomerIds.length} seleccionada{selectedCustomerIds.length === 1 ? '' : 's'})
                        </h6>
                        <span className="text-stone-500 text-xs">
                          Busca por nombre o teléfono y marca las clientas que recibirán este WhatsApp.
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAllFiltered}
                          disabled={loadingCustomers || filteredCustomers.length === 0}
                        >
                          Seleccionar todas ({filteredCustomers.filter((c) => c.phone && c.phone.trim().length >= 8).length})
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDeselectAll}
                          disabled={selectedCustomerIds.length === 0}
                        >
                          Limpiar
                        </Button>
                      </div>
                    </div>

                    {/* Buscador de Clientas */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar clienta por nombre o teléfono..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                      />
                      <FaSearch className="absolute text-stone-400 top-3 left-3 text-xs" />
                      {customerSearch && (
                        <button
                          type="button"
                          className="absolute text-stone-400 hover:text-stone-600 top-2.5 right-3 text-xs"
                          onClick={() => setCustomerSearch('')}
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>

                    {/* Chips de Seleccionadas */}
                    {selectedCustomerIds.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-white border border-stone-200 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-600">
                            Clientas seleccionadas ({selectedCustomerIds.length}):
                          </span>
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                            onClick={handleDeselectAll}
                          >
                            Quitar todas
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          {selectedCustomersDetails.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-rose-50 border border-rose-200 text-amber-950"
                            >
                              <span>{c.fullName}</span>
                              <span className="text-stone-400 text-[10px]">
                                ({c.phone || 'S/T'})
                              </span>
                              <button
                                type="button"
                                className="text-stone-400 hover:text-stone-700 font-bold ml-0.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveCustomerChip(c.id);
                                }}
                                title="Quitar"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lista de Clientas con Casillas */}
                    {loadingCustomers ? (
                      <div className="text-center py-6">
                        <Spinner size="sm" />
                        <span className="ml-2 text-stone-500 text-xs">Cargando base de clientas...</span>
                      </div>
                    ) : (
                      <div className="border border-stone-200 rounded-xl max-h-64 overflow-y-auto divide-y divide-stone-100 bg-white">
                        {filteredCustomers.length === 0 ? (
                          <div className="text-center py-6 text-stone-400 text-xs">
                            No se encontraron clientas con el criterio "{customerSearch}".
                          </div>
                        ) : (
                          filteredCustomers.map((c) => {
                            const isSelected = selectedCustomerIds.includes(c.id);
                            const hasPhone = Boolean(c.phone && c.phone.trim().length >= 8);

                            return (
                              <div
                                key={c.id}
                                className={`p-2.5 px-3.5 flex items-center justify-between transition-colors ${
                                  isSelected ? 'bg-emerald-50/50' : 'hover:bg-stone-50'
                                } ${!hasPhone ? 'opacity-50' : 'cursor-pointer'}`}
                                onClick={() => {
                                  if (hasPhone) toggleCustomerSelection(c.id);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={!hasPhone}
                                    onChange={() => {}}
                                    className="rounded border-stone-300 text-rose-800 focus:ring-rose-500 pointer-events-none"
                                  />
                                  <div>
                                    <div className="font-semibold text-xs text-stone-900">{c.fullName}</div>
                                    <div className="text-stone-500 text-[11px]">
                                      {hasPhone ? (
                                        <span>📱 {c.phone}</span>
                                      ) : (
                                        <span className="text-red-500">⚠️ Sin número de WhatsApp válido</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <Badge variant="neutral">
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
                  <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 space-y-2">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <span className="font-bold text-xs text-stone-800 flex items-center gap-1.5">
                        🎯 Total estimado de destinatarias:
                        <Badge variant="primary">
                          {audiencePreview.totalCount} clientas
                        </Badge>
                      </span>
                      <span className="text-xs text-stone-400">
                        Costo est. Meta: ~${(audiencePreview.totalCount * 0.04).toFixed(2)} USD
                      </span>
                    </div>

                    {audiencePreview.sampleRecipients.length > 0 && (
                      <div className="pt-2 border-t border-stone-200">
                        <div className="text-[11px] text-stone-500 mb-1.5">Muestra de destinatarias:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {audiencePreview.sampleRecipients.slice(0, 6).map((r) => (
                            <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-white border border-stone-200 text-stone-700">
                              👤 {r.fullName} ({r.maskedPhone})
                            </span>
                          ))}
                          {audiencePreview.totalCount > 6 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-stone-100 border border-stone-200 text-stone-500">
                              +{audiencePreview.totalCount - 6} más...
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Personalización de Parámetros Dinámicos ({{2}}) */}
              {selectedTemplate && selectedTemplate.bodyText.includes('{{2}}') && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 md:p-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <h6 className="font-bold text-sm text-amber-950">
                      ✏️ Beneficio o Parámetro Personalizado ({'{{2}}'})
                    </h6>
                    <button
                      type="button"
                      className="text-xs text-rose-800 hover:underline font-medium"
                      onClick={() => initBenefit(selectedTemplate)}
                    >
                      Restablecer por defecto
                    </button>
                  </div>
                  <p className="text-stone-500 text-xs">
                    Puedes cambiar el beneficio, oferta o servicio que se enviará en la plantilla sin requerir re-aprobación de Meta.
                  </p>
                  <input
                    type="text"
                    value={customBenefit}
                    onChange={(e) => setCustomBenefit(e.target.value)}
                    placeholder="Ej: un 20% de descuento exclusivo en tu próxima cita"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-rose-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                  />
                </div>
              )}

              {/* Paso 3: Acciones de Envío */}
              <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 md:p-6 space-y-4">
                <h5 className="font-bold text-amber-950 text-base">3. Acciones de Despacho</h5>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowTestModal(true)}
                    disabled={!selectedTemplate}
                    leftIcon={<FaMobileAlt />}
                  >
                    Enviar Mensaje de Prueba
                  </Button>

                  <Button
                    variant="success"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={
                      !selectedTemplate ||
                      !audiencePreview ||
                      audiencePreview.totalCount === 0 ||
                      (selectedAudience === 'SPECIFIC_CUSTOMERS' && selectedCustomerIds.length === 0)
                    }
                    leftIcon={<FaPaperPlane />}
                  >
                    {selectedAudience === 'SPECIFIC_CUSTOMERS'
                      ? `Enviar a ${selectedCustomerIds.length} Clienta${selectedCustomerIds.length === 1 ? '' : 's'} Seleccionada${selectedCustomerIds.length === 1 ? '' : 's'}`
                      : `Despachar Campaña a ${audiencePreview?.totalCount || 0} Clientas`}
                  </Button>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Simulador Visual de WhatsApp */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="phone-simulator-wrapper">
                {/* Cabecera con botón de edición y eliminación en Meta */}
                {selectedTemplate && (
                  <div className="w-full max-w-[360px] flex justify-between items-center mb-2 px-1">
                    <span className="text-xs font-semibold text-stone-500">Vista Previa:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleOpenEditMeta}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors"
                        title="Editar el texto base oficial registrado en Meta Graph API"
                      >
                        <FaEdit /> Editar en Meta
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTemplateToDelete(selectedTemplate);
                          setShowDeleteModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar plantilla del catálogo y de Meta Cloud API"
                      >
                        <FaTrash /> Eliminar
                      </button>
                    </div>
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
                        <div className="text-center text-stone-400 p-8 text-xs">
                          Selecciona una plantilla para ver su previsualización
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta Informativa de Meta */}
              <div className="wa-meta-policy-card mt-4 p-4 rounded-2xl bg-white border border-rose-100 shadow-sm text-xs text-stone-500 space-y-1.5">
                <div className="font-semibold text-stone-800 mb-1">ℹ️ Políticas de Meta WhatsApp</div>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Las variables dinámicas (como nombres o beneficios) no requieren aprobación previa.</li>
                  <li>Si editas el texto base de la plantilla en Meta, pasará a revisión automática (pocos minutos).</li>
                  <li>Costo por conversación en Chile: ~$0.035 a $0.05 USD.</li>
                  <li>Solo se contacta a clientas con consentimiento de notificaciones activo.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Envío de Prueba */}
        <Modal show={showTestModal} onHide={() => setShowTestModal(false)} size="md">
          <Modal.Header closeButton>
            <Modal.Title>Enviar Mensaje de Prueba</Modal.Title>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <p className="text-stone-500 text-xs">
              Recibirás el mensaje con la plantilla <strong>{selectedTemplate?.displayName}</strong> en tu propio
              WhatsApp para revisar cómo se ve antes de enviarlo a las clientas.
            </p>
            <div>
              <label htmlFor="marketing-campaigns-numero-de-whatsapp-con" className="block text-xs font-semibold text-stone-700 mb-1">
                Número de WhatsApp (con código +56):
              </label>
              <input id="marketing-campaigns-numero-de-whatsapp-con"
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+56912345678"
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
              />
            </div>
            {customBenefit && (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs">
                <strong>Parámetro personalizado ({'{{2}}'}):</strong> {customBenefit}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onClick={() => setShowTestModal(false)} disabled={isSendingTest}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSendTest}
              isLoading={isSendingTest}
              leftIcon={!isSendingTest ? <FaPaperPlane /> : undefined}
            >
              Enviar Prueba
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal de Confirmación y Despacho Masivo */}
        <Modal show={showConfirmModal} onHide={() => !isDispatching && setShowConfirmModal(false)} size="lg">
          <Modal.Header closeButton={!isDispatching}>
            <Modal.Title>
              {dispatchResult ? 'Resultado de la Campaña' : 'Confirmar Envío de Campaña'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            {!dispatchResult ? (
              <>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
                  <FaExclamationTriangle className="text-amber-600 text-lg shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-900 block mb-1">Atención con el costo y reputación de Meta</strong>
                    <div>
                      Estás a punto de enviar la plantilla <strong>{selectedTemplate?.displayName}</strong> a{' '}
                      <strong>{audiencePreview?.totalCount || 0} clientas</strong>. Meta cobrará el valor de
                      conversación de marketing por cada entrega (~$
                      {((audiencePreview?.totalCount || 0) * 0.04).toFixed(2)} USD total estimado).
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-stone-400">Plantilla:</span>{' '}
                      <strong className="text-stone-800">{selectedTemplate?.displayName}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400">Festividad:</span>{' '}
                      <strong className="text-stone-800">{selectedTemplate?.occasion}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400">Audiencia:</span>{' '}
                      <strong className="text-stone-800">{audiencePreview?.audienceDescription}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-stone-400">Total destinatarias:</span>{' '}
                      <Badge variant="success">{audiencePreview?.totalCount || 0} personas</Badge>
                    </div>
                    {selectedAudience === 'SPECIFIC_CUSTOMERS' && selectedCustomersDetails.length > 0 && (
                      <div className="col-span-full pt-2 border-t border-stone-200">
                        <span className="text-stone-400 block mb-1">Destinatarias seleccionadas ({selectedCustomersDetails.length}):</span>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {selectedCustomersDetails.map((c) => (
                            <span key={c.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-white border border-stone-200 text-stone-700">
                              👤 {c.fullName} ({c.phone || 'S/T'})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {customBenefit && (
                      <div className="col-span-full pt-2 border-t border-stone-200">
                        <span className="text-stone-400">Beneficio ({'{{2}}'}):</span>{' '}
                        <strong className="text-rose-900">{customBenefit}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {isDispatching && (
                  <div className="text-center py-4 space-y-2">
                    <Spinner size="lg" variant="primary" />
                    <div className="font-semibold text-xs text-stone-800">Despachando mensajes en ráfagas seguras...</div>
                    <div className="text-[11px] text-stone-400">Por favor no cierres esta ventana.</div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border text-xs ${dispatchResult.failedCount === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  <div className="font-bold text-sm mb-1">
                    {dispatchResult.failedCount === 0
                      ? '🎉 ¡Campaña despachada exitosamente!'
                      : '⚠️ Campaña finalizada con algunas advertencias'}
                  </div>
                  <div>
                    Se enviaron correctamente <strong>{dispatchResult.sentCount}</strong> de{' '}
                    <strong>{dispatchResult.totalTargeted}</strong> mensajes.
                  </div>
                </div>

                {dispatchResult.errorMessages.length > 0 && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                    <span className="font-semibold text-xs text-red-700">Detalle de fallas:</span>
                    <ul className="text-xs text-red-600 mt-1 list-disc pl-4 space-y-0.5">
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
                  variant="ghost"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isDispatching}
                >
                  Cancelar
                </Button>
                <Button
                  variant="success"
                  onClick={handleConfirmDispatch}
                  isLoading={isDispatching}
                  leftIcon={!isDispatching ? <FaPaperPlane /> : undefined}
                >
                  Confirmar y Despachar
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
        <Modal show={showEditMetaModal} onHide={() => !isSavingMeta && setShowEditMetaModal(false)} size="lg">
          <Modal.Header closeButton={!isSavingMeta}>
            <Modal.Title>
              ✏️ Editar Plantilla Oficial en Meta Graph API &bull; {selectedTemplate?.displayName}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <strong>Nota sobre aprobación de Meta:</strong> Al actualizar el texto base oficial, Meta evaluará
              automáticamente los cambios. La plantilla pasará temporalmente a estado <strong>En revisión (PENDING)</strong>{' '}
              durante algunos minutos hasta su re-aprobación.
            </div>

            <div>
              <label htmlFor="marketing-campaigns-encabezado-texto-plano-sin" className="block text-xs font-semibold text-stone-700 mb-1">
                Encabezado (Texto plano, sin emojis según reglas de Meta):
              </label>
              <input id="marketing-campaigns-encabezado-texto-plano-sin"
                type="text"
                value={editHeaderText}
                onChange={(e) => setEditHeaderText(e.target.value)}
                placeholder="Ej: Celebra con BunnyCure"
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
              />
            </div>

            <div>
              <label htmlFor="marketing-campaigns-cuerpo-del-mensaje-soporta" className="block text-xs font-semibold text-stone-700 mb-1">
                Cuerpo del Mensaje (Soporta emojis, *negrita* y variables {'{{1}}'}, {'{{2}}'}):
              </label>
              <textarea id="marketing-campaigns-cuerpo-del-mensaje-soporta"
                rows={6}
                value={editBodyText}
                onChange={(e) => setEditBodyText(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 font-sans"
              />
              <span className="text-stone-400 text-[11px] block mt-1">
                Mantén las variables numéricas como <code>{`{{1}}`}</code> (nombre de la clienta) para que la personalización funcione.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="marketing-campaigns-texto-de-pie-footer" className="block text-xs font-semibold text-stone-700 mb-1">Texto de Pie (Footer):</label>
                <input id="marketing-campaigns-texto-de-pie-footer"
                  type="text"
                  value={editFooterText}
                  onChange={(e) => setEditFooterText(e.target.value)}
                  placeholder="BunnyCure Studio"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                />
              </div>
              <div>
                <label htmlFor="marketing-campaigns-texto-del-boton-cta" className="block text-xs font-semibold text-stone-700 mb-1">Texto del Botón CTA (Sin emojis):</label>
                <input id="marketing-campaigns-texto-del-boton-cta"
                  type="text"
                  value={editButtonText}
                  onChange={(e) => setEditButtonText(e.target.value)}
                  placeholder="Reservar mi hora"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="marketing-campaigns-url-de-destino-del" className="block text-xs font-semibold text-stone-700 mb-1">URL de Destino del Botón:</label>
              <input id="marketing-campaigns-url-de-destino-del"
                type="text"
                value={editButtonUrl}
                onChange={(e) => setEditButtonUrl(e.target.value)}
                placeholder="https://reservar.bunnycure.cl"
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onClick={() => setShowEditMetaModal(false)} disabled={isSavingMeta}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveMetaTemplate}
              isLoading={isSavingMeta}
            >
              Guardar y Enviar a Revisión en Meta
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal: Crear Plantilla con Agente IA (Flujo de 2 pasos) */}
        <Modal
          show={showAiModal}
          onHide={() => !isGeneratingAi && !isSavingApproved && setShowAiModal(false)}
          size={aiStep === 'REVIEW' ? 'xl' : 'lg'}
        >
          <Modal.Header closeButton={!isGeneratingAi && !isSavingApproved}>
            <Modal.Title>
              <div className="flex items-center gap-2 text-purple-700">
                <FaMagic /> Agente Creador de Plantillas Marketing Meta (IA)
                <Badge variant={aiStep === 'PROMPT' ? 'neutral' : 'success'}>
                  {aiStep === 'PROMPT' ? '1. Definir Idea' : '2. Revisión y Visto Bueno'}
                </Badge>
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            {aiStep === 'PROMPT' ? (
              <>
                <p className="text-stone-500 text-xs">
                  Describe en lenguaje natural la campaña, promoción o festividad que deseas comunicar. El Agente IA propondrá una redacción profesional optimizada para Meta para que <strong>puedas revisarla, editarla y dar tu visto bueno</strong> antes de guardarla o registrarla.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">Ideas rápidas / Sugerencias:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Promoción Cyber Day: 25% dcto en Esmaltado Permanente y Manicura Rusa',
                      'Especial Verano: Prepara tus uñas para la playa con descuento dúo Manicura + Pedicura',
                      'Especial Black Friday: Reserva tu hora anticipada de fin de año con 20% off',
                      'Especial Graduaciones y Fiestas de Gala: Luce tus uñas perfectas este fin de semana',
                    ].map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="p-2 text-left text-xs bg-stone-50 hover:bg-rose-50 border border-stone-200 rounded-xl text-stone-700 transition-colors"
                        onClick={() => setAiPrompt(sug)}
                      >
                        ✨ {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="marketing-campaigns-que-campana-o-mensaje" className="block text-xs font-semibold text-stone-700 mb-1">
                    ¿Qué campaña o mensaje deseas crear?
                  </label>
                  <textarea id="marketing-campaigns-que-campana-o-mensaje"
                    rows={3}
                    placeholder="Ej: Crea una promoción para Navidad con 20% de descuento en extensiones de uñas acrílicas y diseño festivo..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    disabled={isGeneratingAi}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 bg-white"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700">
                  <input
                    type="checkbox"
                    className="rounded border-stone-300 text-rose-800 focus:ring-rose-500"
                    checked={aiAutoRegister}
                    onChange={(e) => setAiAutoRegister(e.target.checked)}
                    disabled={isGeneratingAi}
                  />
                  <span>
                    <strong>Registrar automáticamente en Meta WhatsApp Cloud API</strong> (se enviará para aprobación inmediata de Meta al dar el visto bueno)
                  </span>
                </label>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">💡</span>
                    <div>
                      <strong className="block text-stone-900 text-xs">Propuesta generada por el Agente IA</strong>
                      <span className="text-stone-500 text-[11px]">
                        Revisa el mensaje, edita cualquier campo para ajustarlo a tus preferencias y presiona <strong>"Dar Visto Bueno"</strong> cuando esté listo.
                      </span>
                    </div>
                  </div>
                  <Badge variant="primary">Modo Edición y Aprobación</Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Columna Izquierda: Formulario de Ajustes */}
                  <div className="lg:col-span-7 p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                    <h6 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                      <FaEdit className="text-purple-600" /> Ajustar Contenido de la Plantilla
                    </h6>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label htmlFor="marketing-campaigns-nombre-de-la-campana" className="block text-[11px] font-semibold text-stone-600 mb-1">Nombre de la Campaña</label>
                        <input id="marketing-campaigns-nombre-de-la-campana"
                          type="text"
                          value={draftDisplayName}
                          onChange={(e) => setDraftDisplayName(e.target.value)}
                          placeholder="Ej: Cyber Day Especial ✨"
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                      </div>
                      <div>
                        <label htmlFor="marketing-campaigns-emoji-icono" className="block text-[11px] font-semibold text-stone-600 mb-1">Emoji / Icono</label>
                        <input id="marketing-campaigns-emoji-icono"
                          type="text"
                          value={draftEmoji}
                          onChange={(e) => setDraftEmoji(e.target.value)}
                          placeholder="💅"
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[11px] font-semibold text-stone-600 mb-1">
                        <span>Encabezado en WhatsApp (Opcional)</span>
                        <span className="text-stone-400 font-normal">{draftHeaderText.length}/60 car.</span>
                      </div>
                      <input
                        type="text"
                        value={draftHeaderText}
                        onChange={(e) => setDraftHeaderText(e.target.value)}
                        placeholder="Ej: Especial Verano en BunnyCure"
                        maxLength={60}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                      <span className="text-stone-400 text-[10px] block mt-0.5">
                        Regla de Meta: No debe incluir emojis ni formato en la cabecera.
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[11px] font-semibold text-stone-600 mb-1">
                        <span>Cuerpo del Mensaje <span className="text-red-500">*</span></span>
                        <span className={`text-[10px] ${draftBodyText.length > 1000 ? 'text-red-600 font-bold' : 'text-stone-400'}`}>
                          {draftBodyText.length} / 1024 caracteres
                        </span>
                      </div>
                      <textarea
                        rows={6}
                        value={draftBodyText}
                        onChange={(e) => setDraftBodyText(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 leading-relaxed"
                        placeholder="Escribe el mensaje..."
                      />
                      <span className="text-stone-400 text-[10px] block mt-0.5">
                        ℹ️ La variable <code>{`{{1}}`}</code> representa el nombre de cada clienta (ej: Camila).
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="marketing-campaigns-pie-de-pagina-footer" className="block text-[11px] font-semibold text-stone-600 mb-1">Pie de Página (Footer)</label>
                        <input id="marketing-campaigns-pie-de-pagina-footer"
                          type="text"
                          value={draftFooterText}
                          onChange={(e) => setDraftFooterText(e.target.value)}
                          placeholder="BunnyCure Studio"
                          maxLength={60}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                      </div>
                      <div>
                        <label htmlFor="marketing-campaigns-boton-de-accion-cta" className="block text-[11px] font-semibold text-stone-600 mb-1">Botón de Acción (CTA)</label>
                        <input id="marketing-campaigns-boton-de-accion-cta"
                          type="text"
                          value={draftButtonText}
                          onChange={(e) => setDraftButtonText(e.target.value)}
                          placeholder="Reservar mi cita"
                          maxLength={25}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="marketing-campaigns-enlace-del-boton" className="block text-[11px] font-semibold text-stone-600 mb-1">Enlace del Botón</label>
                      <input id="marketing-campaigns-enlace-del-boton"
                        type="text"
                        value={draftButtonUrl}
                        onChange={(e) => setDraftButtonUrl(e.target.value)}
                        placeholder="https://reservar.bunnycure.cl"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700 pt-1">
                      <input
                        type="checkbox"
                        className="rounded border-stone-300 text-rose-800 focus:ring-rose-500"
                        checked={aiAutoRegister}
                        onChange={(e) => setAiAutoRegister(e.target.checked)}
                      />
                      <span>
                        <strong>Registrar automáticamente en Meta WhatsApp Cloud API</strong> (enviar a aprobación oficial inmediata)
                      </span>
                    </label>
                  </div>

                  {/* Columna Derecha: Previsualización en Vivo de WhatsApp */}
                  <div className="lg:col-span-5 border border-stone-200 rounded-2xl p-4 bg-white shadow-sm flex flex-col">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-100 text-xs">
                      <span className="font-bold text-stone-600 flex items-center gap-1.5">
                        <FaMobileAlt className="text-emerald-600" /> Previsualización en WhatsApp
                      </span>
                      <Badge variant="success">En Vivo</Badge>
                    </div>

                    {/* Mockup de Chat WhatsApp */}
                    <div
                      className="rounded-2xl p-4 flex-grow flex flex-col justify-start"
                      style={{
                        background: '#efeae2',
                        minHeight: '320px',
                      }}
                    >
                      <div className="wa-bubble shadow-sm w-full">
                        {draftHeaderText.trim() && (
                          <div className="wa-bubble-header">
                            {draftHeaderText.trim()}
                          </div>
                        )}
                        <div className="wa-bubble-text whitespace-pre-wrap">
                          {draftBodyText.replace(/\{\{1\}\}/g, 'Camila') || 'El mensaje aparecerá aquí...'}
                        </div>
                        <div className="wa-bubble-footer">
                          <span>{draftFooterText || 'BunnyCure Studio'}</span>
                          <span className="wa-bubble-time">
                            11:45 AM <FaCheckCircle style={{ fontSize: '9px', color: '#53bdeb' }} />
                          </span>
                        </div>
                        {draftButtonText.trim() && (
                          <div className="wa-bubble-button mt-2">
                            <FaExternalLinkAlt style={{ fontSize: '11px' }} />
                            <span>{draftButtonText.trim()}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-center mt-auto pt-4">
                        <span className="text-stone-500 text-[11px]">
                          Simulación con destinataria: <strong>Camila</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="flex justify-between">
            {aiStep === 'PROMPT' ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setShowAiModal(false)}
                  disabled={isGeneratingAi}
                >
                  Cerrar
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleGenerateAiDraft()}
                  disabled={isGeneratingAi || !aiPrompt.trim()}
                  isLoading={isGeneratingAi}
                  leftIcon={!isGeneratingAi ? <FaMagic /> : undefined}
                >
                  Generar Propuesta con IA
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setAiStep('PROMPT')}
                  disabled={isSavingApproved}
                >
                  ← Volver / Probar otra idea
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowAiModal(false)}
                    disabled={isSavingApproved}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="success"
                    onClick={handleSaveApproved}
                    disabled={isSavingApproved || !draftBodyText.trim()}
                    isLoading={isSavingApproved}
                    leftIcon={!isSavingApproved ? <FaCheckCircle /> : undefined}
                  >
                    Dar Visto Bueno y {aiAutoRegister ? 'Registrar en Meta' : 'Guardar'}
                  </Button>
                </div>
              </>
            )}
          </Modal.Footer>
        </Modal>

        {/* Modal de Confirmación de Eliminación en Meta */}
        <Modal show={showDeleteModal} onHide={() => !isDeletingTemplate && setShowDeleteModal(false)} size="md">
          <Modal.Header closeButton={!isDeletingTemplate}>
            <Modal.Title>
              <div className="flex items-center gap-2 text-red-600">
                <FaTrash /> Eliminar Plantilla de Meta y Catálogo
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="space-y-3">
            <p className="text-sm text-stone-700">
              ¿Estás seguro de que deseas eliminar permanentemente la plantilla{' '}
              <strong>"{templateToDelete?.displayName}"</strong>?
            </p>
            <div className="bg-stone-50 p-2.5 rounded-xl text-xs text-stone-500 font-mono">
              Identificador Meta: {templateToDelete?.name}
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <FaExclamationTriangle className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Atención:</strong> Esta acción enviará una solicitud a Meta Cloud API para eliminar el mensaje de plantilla de tu cuenta oficial de WhatsApp Business (WABA) y la quitará de BunnyCure.
              </span>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeletingTemplate}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteTemplate}
              isLoading={isDeletingTemplate}
              leftIcon={!isDeletingTemplate ? <FaTrash /> : undefined}
            >
              Sí, Eliminar de Meta
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
