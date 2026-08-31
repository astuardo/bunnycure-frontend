import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Form,
  InputGroup,
  Modal,
  Nav,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEdit3,
  FiFileText,
  FiLayers,
  FiMail,
  FiPlusCircle,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiShield,
  FiTrash2,
  FiX,
  FiXCircle,
} from 'react-icons/fi';
import DashboardLayout from '@/components/common/DashboardLayout';
import { invoicesApi } from '@/api/invoices.api';
import {
  InvoiceContrastResult,
  InvoiceIssuedItem,
  InvoicePendingAppointment,
  InvoiceSummary,
  SII_CANCEL_CAUSES,
} from '@/types/invoice.types';
import { useToast } from '@/hooks/useToast';
import { formatCurrencyCLP } from '@/utils/formatters';
import { formatRutWithDots, isValidRutDv, isValidRutFormat } from '@/utils/rutUtils';

export default function InvoicesPage() {
  const toast = useToast();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'pending' | 'issued' | 'contrast'>('pending');

  // Selected period YYYYMM (default current year and month)
  const currentPeriod = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
  }, []);

  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentPeriod);

  // Data states
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [pendingList, setPendingList] = useState<InvoicePendingAppointment[]>([]);
  const [issuedList, setIssuedList] = useState<InvoiceIssuedItem[]>([]);
  const [contrastResult, setContrastResult] = useState<InvoiceContrastResult | null>(null);

  // Multi-selection state for pending appointments
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<number[]>([]);

  // Loading states
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingIssued, setLoadingIssued] = useState(false);
  const [loadingContrast, setLoadingContrast] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingFilter, setPendingFilter] = useState<'ALL' | 'ERRORS' | 'NO_RUT'>('ALL');

  // Modals state
  const [emitModalOpen, setEmitModalOpen] = useState(false);
  const [selectedPending, setSelectedPending] = useState<InvoicePendingAppointment | null>(null);
  const [editRut, setEditRut] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Single Manual Mark Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualPendingItem, setManualPendingItem] = useState<InvoicePendingAppointment | null>(null);
  const [manualFolio, setManualFolio] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  // Batch Manual Mark Modal
  const [batchManualModalOpen, setBatchManualModalOpen] = useState(false);
  const [batchInitialFolio, setBatchInitialFolio] = useState('');
  const [batchManualNotes, setBatchManualNotes] = useState('Boletas emitidas a mano en plataforma SII');

  // Batch Emit Modal
  const [batchEmitModalOpen, setBatchEmitModalOpen] = useState(false);

  // Resend Email Modal
  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [selectedIssued, setSelectedIssued] = useState<InvoiceIssuedItem | null>(null);
  const [resendEmailTarget, setResendEmailTarget] = useState('');

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelFolio, setCancelFolio] = useState<string | null>(null);
  const [cancelCause, setCancelCause] = useState('3');

  // ─── Data Loaders ──────────────────────────────────────────────────────────

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const data = await invoicesApi.getSummary();
      setSummary(data);
    } catch {
      toast.error('No se pudo cargar el resumen de facturación');
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadPending = async () => {
    setLoadingPending(true);
    try {
      const data = await invoicesApi.getPending();
      setPendingList(data);
      setSelectedAppointmentIds([]);
    } catch {
      toast.error('Error al cargar citas con boletas pendientes');
    } finally {
      setLoadingPending(false);
    }
  };

  const loadIssued = async () => {
    setLoadingIssued(true);
    try {
      const data = await invoicesApi.getLocalIssued(selectedPeriod);
      setIssuedList(data);
    } catch {
      toast.error('Error al cargar historial de boletas emitidas');
    } finally {
      setLoadingIssued(false);
    }
  };

  const loadContrast = async (forceRefresh = false) => {
    setLoadingContrast(true);
    try {
      const data = await invoicesApi.contrastWithSii(selectedPeriod, forceRefresh);
      setContrastResult(data);
      if (forceRefresh) {
        toast.success('Contraste actualizado en tiempo real con el SII');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al contrastar boletas con el SII');
    } finally {
      setLoadingContrast(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadSummary();
    loadPending();
  }, []);

  // Reload period dependent data
  useEffect(() => {
    if (activeTab === 'issued') {
      loadIssued();
    }
  }, [activeTab, selectedPeriod]);

  const handleRefreshAll = () => {
    loadSummary();
    if (activeTab === 'pending') loadPending();
    if (activeTab === 'issued') loadIssued();
    if (activeTab === 'contrast') loadContrast(false);
  };

  // ─── Filtered Data ─────────────────────────────────────────────────────────

  const filteredPending = useMemo(() => {
    return pendingList.filter((item) => {
      // Filter type
      if (pendingFilter === 'ERRORS' && item.invoiceStatus !== 'FAILED') return false;
      if (pendingFilter === 'NO_RUT' && item.rutStatus === 'VALID') return false;

      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = item.customerName?.toLowerCase().includes(term);
        const matchesRut = item.customerRut?.toLowerCase().includes(term);
        const matchesId = String(item.appointmentId).includes(term);
        const matchesService = item.servicesSummary?.toLowerCase().includes(term);
        return matchesName || matchesRut || matchesId || matchesService;
      }
      return true;
    });
  }, [pendingList, pendingFilter, searchTerm]);

  const filteredIssued = useMemo(() => {
    return issuedList.filter((item) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchesFolio = item.invoiceNumber?.toLowerCase().includes(term);
      const matchesName = item.customerName?.toLowerCase().includes(term);
      const matchesRut = item.customerRut?.toLowerCase().includes(term);
      const matchesCode = item.siiCode?.toLowerCase().includes(term);
      return matchesFolio || matchesName || matchesRut || matchesCode;
    });
  }, [issuedList, searchTerm]);

  // Selected items calculation
  const selectedItemsData = useMemo(() => {
    return pendingList.filter((item) => selectedAppointmentIds.includes(item.appointmentId));
  }, [pendingList, selectedAppointmentIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedItemsData.reduce((acc, item) => acc + (item.totalAmount || 0), 0);
  }, [selectedItemsData]);

  const selectedValidRutsCount = useMemo(() => {
    return selectedItemsData.filter((item) => item.rutStatus === 'VALID').length;
  }, [selectedItemsData]);

  // ─── Selection Handlers ───────────────────────────────────────────────────

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFilteredIds = filteredPending.map((item) => item.appointmentId);
      setSelectedAppointmentIds(allFilteredIds);
    } else {
      setSelectedAppointmentIds([]);
    }
  };

  const handleToggleSelectOne = (id: number) => {
    setSelectedAppointmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ─── Individual Handlers ───────────────────────────────────────────────────

  const handleOpenEmitModal = (item: InvoicePendingAppointment) => {
    setSelectedPending(item);
    setEditRut(item.customerRut || '');
    setEditEmail(item.customerEmail || '');
    setEmitModalOpen(true);
  };

  const handleConfirmEmit = async () => {
    if (!selectedPending) return;

    if (editRut.trim()) {
      const formatted = formatRutWithDots(editRut.trim());
      if (!isValidRutFormat(formatted) || !isValidRutDv(formatted.replace(/[^0-9K]/g, ''))) {
        toast.error('El RUT ingresado no es válido');
        return;
      }
    }

    setActionLoading(true);
    try {
      await invoicesApi.emitForAppointment(selectedPending.appointmentId, {
        customerRut: editRut.trim() ? formatRutWithDots(editRut.trim()) : undefined,
        customerEmail: editEmail.trim() || undefined,
      });
      toast.success(`Boleta emitida exitosamente para la cita #${selectedPending.appointmentId}`);
      setEmitModalOpen(false);
      loadSummary();
      loadPending();
      if (activeTab === 'issued') loadIssued();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al emitir boleta');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenManualModal = (item: InvoicePendingAppointment) => {
    setManualPendingItem(item);
    setManualFolio('');
    setManualNotes('Boleta emitida a mano en plataforma SII');
    setManualModalOpen(true);
  };

  const handleConfirmManual = async () => {
    if (!manualPendingItem) return;

    setActionLoading(true);
    try {
      await invoicesApi.markManual(manualPendingItem.appointmentId, {
        invoiceNumber: manualFolio.trim() || undefined,
        notes: manualNotes.trim() || undefined,
      });
      toast.success(`Cita #${manualPendingItem.appointmentId} registrada como emitida a mano (0 créditos)`);
      setManualModalOpen(false);
      loadSummary();
      loadPending();
      if (activeTab === 'issued') loadIssued();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al registrar boleta manual');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Batch Handlers ───────────────────────────────────────────────────────

  const handleOpenBatchManualModal = () => {
    if (selectedAppointmentIds.length === 0) return;
    setBatchInitialFolio('');
    setBatchManualNotes('Boletas emitidas a mano en plataforma SII');
    setBatchManualModalOpen(true);
  };

  const handleConfirmBatchManual = async () => {
    if (selectedAppointmentIds.length === 0) return;

    setActionLoading(true);
    try {
      const results = await invoicesApi.batchMarkManual({
        appointmentIds: selectedAppointmentIds,
        initialFolio: batchInitialFolio.trim() || undefined,
        notes: batchManualNotes.trim() || undefined,
      });
      toast.success(`${results.length} citas marcadas exitosamente como emitidas manualmente (0 créditos)`);
      setBatchManualModalOpen(false);
      setSelectedAppointmentIds([]);
      loadSummary();
      loadPending();
      if (activeTab === 'issued') loadIssued();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al marcar citas en lote');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenBatchEmitModal = () => {
    if (selectedAppointmentIds.length === 0) return;
    setBatchEmitModalOpen(true);
  };

  const handleConfirmBatchEmit = async () => {
    if (selectedAppointmentIds.length === 0) return;

    setActionLoading(true);
    try {
      const response = await invoicesApi.batchEmit(selectedAppointmentIds);
      if (response.failedCount > 0) {
        toast.warning(
          `Emisión completada: ${response.successCount} exitosas, ${response.failedCount} con error.`
        );
      } else {
        toast.success(`¡Todas las ${response.successCount} boletas fueron emitidas exitosamente en el SII!`);
      }
      setBatchEmitModalOpen(false);
      setSelectedAppointmentIds([]);
      loadSummary();
      loadPending();
      if (activeTab === 'issued') loadIssued();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error en emisión masiva');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Issued Actions ────────────────────────────────────────────────────────

  const handleDownloadPdf = async (codigo?: string, folio?: string) => {
    if (!codigo || codigo === 'MANUAL') {
      toast.warning('Esta boleta fue registrada manualmente y no tiene archivo PDF en el gateway del SII.');
      return;
    }
    setActionLoading(true);
    try {
      await invoicesApi.downloadPdf(codigo, folio);
      toast.success('Descarga de PDF iniciada');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error descargando PDF oficial');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenResendModal = (item: InvoiceIssuedItem) => {
    setSelectedIssued(item);
    setResendEmailTarget(item.customerEmail || item.emailRecipient || '');
    setResendModalOpen(true);
  };

  const handleConfirmResend = async () => {
    if (!selectedIssued || !selectedIssued.siiCode || selectedIssued.siiCode === 'MANUAL') {
      toast.warning('No se puede reenviar correo SII para boletas marcadas a mano.');
      return;
    }
    setActionLoading(true);
    try {
      await invoicesApi.resendEmail(selectedIssued.siiCode, resendEmailTarget.trim() || undefined);
      toast.success('Correo oficial del SII despachado con éxito');
      setResendModalOpen(false);
      loadIssued();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al reenviar correo vía SII');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCancelModal = (folio: string) => {
    setCancelFolio(folio);
    setCancelCause('3');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelFolio) return;
    setActionLoading(true);
    try {
      await invoicesApi.cancelInvoice(cancelFolio, cancelCause);
      toast.success(`Boleta Folio #${cancelFolio} anulada exitosamente en el SII`);
      setCancelModalOpen(false);
      loadIssued();
      loadSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al anular boleta en el SII');
    } finally {
      setActionLoading(false);
    }
  };

  // Format period for display (e.g. 202608 -> Agosto 2026)
  const formatPeriodDisplay = (periodStr: string) => {
    if (!periodStr || periodStr.length !== 6) return periodStr;
    const year = periodStr.substring(0, 4);
    const monthIndex = parseInt(periodStr.substring(4, 6), 10) - 1;
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return `${months[monthIndex] || ''} ${year}`;
  };

  const isAllFilteredSelected =
    filteredPending.length > 0 &&
    filteredPending.every((item) => selectedAppointmentIds.includes(item.appointmentId));

  return (
    <DashboardLayout>
      <div className="container-fluid py-3 px-md-4">
        {/* Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h1 className="h3 mb-1 fw-bold text-dark d-flex align-items-center gap-2">
              <span style={{ fontSize: '1.4rem' }}>🧾</span> Boletas SII (BHE)
            </h1>
            <p className="text-muted small mb-0">
              Trazabilidad de boletas por emitir, selección múltiple, emisión manual y contraste oficial con el SII.
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Period selector */}
            <div className="d-flex align-items-center gap-1 bg-white border rounded px-2 py-1 shadow-xs">
              <small className="text-muted fw-bold">Período:</small>
              <Form.Select
                size="sm"
                className="border-0 bg-transparent fw-semibold shadow-none text-dark"
                style={{ width: '150px', cursor: 'pointer' }}
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="202608">Agosto 2026</option>
                <option value="202607">Julio 2026</option>
                <option value="202606">Junio 2026</option>
                <option value="202605">Mayo 2026</option>
                <option value="202604">Abril 2026</option>
                <option value="202603">Marzo 2026</option>
                <option value="202602">Febrero 2026</option>
                <option value="202601">Enero 2026</option>
              </Form.Select>
            </div>

            <Button
              variant="outline-secondary"
              size="sm"
              className="d-flex align-items-center gap-1 bg-white"
              onClick={handleRefreshAll}
              disabled={loadingSummary || loadingPending || loadingIssued || loadingContrast}
            >
              <FiRefreshCw className={loadingSummary || loadingPending ? 'spin' : ''} />
              <span>Actualizar</span>
            </Button>

            {summary?.apiGatewayConfigured ? (
              <Badge bg="success" className="px-2 py-2 d-flex align-items-center gap-1 shadow-xs">
                <FiCheckCircle /> SII Conectado
              </Badge>
            ) : (
              <Badge bg="warning" text="dark" className="px-2 py-2 d-flex align-items-center gap-1 shadow-xs">
                <FiAlertTriangle /> Modo Pruebas (Dry-Run)
              </Badge>
            )}
          </div>
        </div>

        {/* Top Metric Cards */}
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-xs rounded-3 h-100 bg-white">
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-muted small fw-bold text-uppercase">Boletas Emitidas (Mes)</span>
                  <div className="p-2 rounded-2 bg-success bg-opacity-10 text-success">
                    <FiFileText size={18} />
                  </div>
                </div>
                <h3 className="h4 fw-bold mb-1 text-dark">
                  {summary ? summary.generatedThisMonth : <Spinner size="sm" animation="border" />}
                </h3>
                <small className="text-success fw-semibold">
                  Total facturado: {summary ? formatCurrencyCLP(summary.totalAmountMonth) : '$0'}
                </small>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <Card
              className={`border-0 shadow-xs rounded-3 h-100 bg-white ${
                summary && summary.pendingInvoicesCount > 0 ? 'border-start border-4 border-warning' : ''
              }`}
            >
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-muted small fw-bold text-uppercase">Por Emitir / Faltantes</span>
                  <div
                    className={`p-2 rounded-2 ${
                      summary && summary.pendingInvoicesCount > 0
                        ? 'bg-warning bg-opacity-10 text-warning'
                        : 'bg-light text-muted'
                    }`}
                  >
                    <FiAlertTriangle size={18} />
                  </div>
                </div>
                <h3
                  className={`h4 fw-bold mb-1 ${
                    summary && summary.pendingInvoicesCount > 0 ? 'text-warning' : 'text-dark'
                  }`}
                >
                  {summary ? summary.pendingInvoicesCount : <Spinner size="sm" animation="border" />}
                </h3>
                <small className="text-muted">
                  {summary && summary.failedInvoicesCount > 0
                    ? `${summary.failedInvoicesCount} con error previo`
                    : 'Citas completadas'}
                </small>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-xs rounded-3 h-100 bg-white">
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-muted small fw-bold text-uppercase">Envío Automático Email</span>
                  <div className="p-2 rounded-2 bg-secondary bg-opacity-10 text-secondary">
                    <FiMail size={18} />
                  </div>
                </div>
                <h3 className="h5 fw-bold mb-1 text-dark">
                  {summary?.sendEmailEnabled ? 'Habilitado' : 'Desactivado (Manual)'}
                </h3>
                <small className="text-muted">
                  {summary?.sendEmailEnabled ? 'Despacho automático' : 'Emisión sin correo automático'}
                </small>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} sm={6} lg={3}>
            <Card className="border-0 shadow-xs rounded-3 h-100 bg-white">
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-muted small fw-bold text-uppercase">RUT Emisor SII</span>
                  <div className="p-2 rounded-2 bg-secondary bg-opacity-10 text-secondary">
                    <FiShield size={18} />
                  </div>
                </div>
                <h3 className="h5 fw-bold mb-1 text-dark text-truncate">
                  {summary?.emisorRut ? formatRutWithDots(summary.emisorRut) : 'No configurado'}
                </h3>
                <small className="text-muted">2da Categoría - Retención Emisor</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Navigation Tabs */}
        <Card className="border-0 shadow-xs rounded-3 bg-white mb-4">
          <Card.Header className="bg-white border-bottom p-2 p-md-3">
            <Nav variant="pills" className="gap-2">
              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'pending'}
                  onClick={() => setActiveTab('pending')}
                  className="d-flex align-items-center gap-2 px-3 py-2 fw-semibold rounded-2"
                  style={{
                    backgroundColor: activeTab === 'pending' ? '#c9897a' : 'transparent',
                    color: activeTab === 'pending' ? '#fff' : '#5c3d2e',
                  }}
                >
                  <FiAlertTriangle />
                  <span>Boletas por Emitir</span>
                  {pendingList.length > 0 && (
                    <Badge
                      bg={activeTab === 'pending' ? 'light' : 'warning'}
                      text={activeTab === 'pending' ? 'dark' : 'dark'}
                      pill
                    >
                      {pendingList.length}
                    </Badge>
                  )}
                </Nav.Link>
              </Nav.Item>

              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'issued'}
                  onClick={() => setActiveTab('issued')}
                  className="d-flex align-items-center gap-2 px-3 py-2 fw-semibold rounded-2"
                  style={{
                    backgroundColor: activeTab === 'issued' ? '#c9897a' : 'transparent',
                    color: activeTab === 'issued' ? '#fff' : '#5c3d2e',
                  }}
                >
                  <FiFileText />
                  <span>Boletas Emitidas</span>
                </Nav.Link>
              </Nav.Item>

              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'contrast'}
                  onClick={() => setActiveTab('contrast')}
                  className="d-flex align-items-center gap-2 px-3 py-2 fw-semibold rounded-2"
                  style={{
                    backgroundColor: activeTab === 'contrast' ? '#c9897a' : 'transparent',
                    color: activeTab === 'contrast' ? '#fff' : '#5c3d2e',
                  }}
                >
                  <FiRefreshCw />
                  <span>Contraste con el SII</span>
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Card.Header>

          <Card.Body className="p-3 p-md-4">
            {/* ─────────────────────────────────────────────────────────────────
                TAB 1: BOLETAS PENDIENTES / POR EMITIR (0 Créditos)
            ───────────────────────────────────────────────────────────────── */}
            {activeTab === 'pending' && (
              <div>
                {/* Floating/Sticky Batch Action Banner */}
                {selectedAppointmentIds.length > 0 && (
                  <div className="p-3 bg-dark text-white rounded-3 mb-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 shadow">
                    <div className="d-flex align-items-center gap-2">
                      <Badge bg="warning" text="dark" pill className="fs-6 px-3 py-2">
                        {selectedAppointmentIds.length} seleccionadas
                      </Badge>
                      <span className="small text-light">
                        Monto total: <strong>{formatCurrencyCLP(selectedTotalAmount)}</strong> | RUTs válidos:{' '}
                        <strong>
                          {selectedValidRutsCount}/{selectedAppointmentIds.length}
                        </strong>
                      </span>
                    </div>

                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        className="d-flex align-items-center gap-1 shadow-sm"
                        onClick={handleOpenBatchManualModal}
                      >
                        <FiEdit3 />
                        <span>Marcar como Emitidas a Mano ({selectedAppointmentIds.length})</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="primary"
                        style={{ backgroundColor: '#c9897a', borderColor: '#c9897a' }}
                        className="d-flex align-items-center gap-1 shadow-sm"
                        onClick={handleOpenBatchEmitModal}
                      >
                        <FiSend />
                        <span>Emitir al SII ({selectedAppointmentIds.length})</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline-light"
                        onClick={() => setSelectedAppointmentIds([])}
                        title="Deseleccionar todo"
                      >
                        <FiX />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Filters and search */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <span className="text-muted small fw-bold">Filtro:</span>
                    <Button
                      size="sm"
                      variant={pendingFilter === 'ALL' ? 'dark' : 'outline-secondary'}
                      onClick={() => setPendingFilter('ALL')}
                      className="rounded-pill"
                    >
                      Todas ({pendingList.length})
                    </Button>
                    <Button
                      size="sm"
                      variant={pendingFilter === 'ERRORS' ? 'danger' : 'outline-danger'}
                      onClick={() => setPendingFilter('ERRORS')}
                      className="rounded-pill"
                    >
                      Con Error ({pendingList.filter((i) => i.invoiceStatus === 'FAILED').length})
                    </Button>
                    <Button
                      size="sm"
                      variant={pendingFilter === 'NO_RUT' ? 'warning' : 'outline-warning'}
                      onClick={() => setPendingFilter('NO_RUT')}
                      className="rounded-pill text-dark"
                    >
                      Sin RUT o Inválido ({pendingList.filter((i) => i.rutStatus !== 'VALID').length})
                    </Button>
                  </div>

                  <InputGroup style={{ maxWidth: '320px' }}>
                    <InputGroup.Text className="bg-light border-end-0">
                      <FiSearch className="text-muted" />
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Buscar por cliente, RUT o ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-start-0 bg-light"
                      size="sm"
                    />
                  </InputGroup>
                </div>

                {loadingPending ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" style={{ color: '#c9897a' }} />
                    <p className="text-muted mt-2 small">Cargando citas por emitir...</p>
                  </div>
                ) : filteredPending.length === 0 ? (
                  <div className="text-center py-5 border rounded-3 bg-light bg-opacity-50">
                    <span style={{ fontSize: '2.5rem' }}>✨</span>
                    <h5 className="mt-2 fw-bold text-dark">¡Todo al día!</h5>
                    <p className="text-muted small mb-0">
                      No hay citas completadas pendientes de emisión de boleta que coincidan con el filtro.
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="align-middle mb-0 border-top">
                      <thead className="table-light small text-muted text-uppercase">
                        <tr>
                          <th style={{ width: '40px' }} className="text-center">
                            <Form.Check
                              type="checkbox"
                              checked={isAllFilteredSelected}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              title="Seleccionar todas las visibles"
                            />
                          </th>
                          <th>Cita #</th>
                          <th>Fecha / Hora</th>
                          <th>Cliente</th>
                          <th>RUT Cliente</th>
                          <th>Servicios</th>
                          <th>Monto</th>
                          <th>Diagnóstico / Estado</th>
                          <th className="text-end">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPending.map((item) => {
                          const isSelected = selectedAppointmentIds.includes(item.appointmentId);
                          return (
                            <tr key={item.appointmentId} className={isSelected ? 'table-active' : ''}>
                              <td className="text-center">
                                <Form.Check
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectOne(item.appointmentId)}
                                />
                              </td>
                              <td className="fw-bold text-dark">#{item.appointmentId}</td>
                              <td>
                                <div>{item.appointmentDate}</div>
                                <small className="text-muted">{item.appointmentTime?.substring(0, 5)}</small>
                              </td>
                              <td>
                                <div className="fw-semibold text-dark">{item.customerName}</div>
                                <small className="text-muted">{item.customerEmail || 'Sin correo'}</small>
                              </td>
                              <td>
                                {item.customerRut ? (
                                  <Badge
                                    bg={item.rutStatus === 'VALID' ? 'success' : 'danger'}
                                    className="font-monospace"
                                  >
                                    {formatRutWithDots(item.customerRut)}
                                  </Badge>
                                ) : (
                                  <Badge bg="warning" text="dark">
                                    Falta RUT
                                  </Badge>
                                )}
                              </td>
                              <td>
                                <small className="text-truncate d-inline-block" style={{ maxWidth: '200px' }}>
                                  {item.servicesSummary}
                                </small>
                              </td>
                              <td className="fw-bold text-dark">{formatCurrencyCLP(item.totalAmount)}</td>
                              <td>
                                {item.invoiceStatus === 'FAILED' ? (
                                  <div className="text-danger small">
                                    <Badge bg="danger" className="mb-1">
                                      <FiXCircle /> Error al emitir
                                    </Badge>
                                    <div
                                      className="text-truncate"
                                      style={{ maxWidth: '220px', fontSize: '11px' }}
                                      title={item.errorMessage || ''}
                                    >
                                      {item.errorMessage || 'Error en comunicación con SII'}
                                    </div>
                                  </div>
                                ) : item.rutStatus !== 'VALID' ? (
                                  <Badge bg="warning" text="dark">
                                    Requiere RUT válido
                                  </Badge>
                                ) : (
                                  <Badge bg="secondary">
                                    <FiClock /> Sin emitir
                                  </Badge>
                                )}
                              </td>
                              <td className="text-end">
                                <ButtonGroup size="sm">
                                  <Button
                                    variant="primary"
                                    style={{ backgroundColor: '#c9897a', borderColor: '#c9897a' }}
                                    className="d-inline-flex align-items-center gap-1 shadow-xs"
                                    onClick={() => handleOpenEmitModal(item)}
                                    title="Emitir boleta en el SII"
                                  >
                                    <FiSend size={12} />
                                    <span>Emitir</span>
                                  </Button>

                                  <Button
                                    variant="outline-secondary"
                                    onClick={() => handleOpenManualModal(item)}
                                    title="Marcar como emitida a mano (sin enviar al SII, 0 créditos)"
                                  >
                                    <FiEdit3 size={12} />
                                    <span className="d-none d-lg-inline ms-1">A Mano</span>
                                  </Button>
                                </ButtonGroup>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                TAB 2: BOLETAS EMITIDAS (0 Créditos)
            ───────────────────────────────────────────────────────────────── */}
            {activeTab === 'issued' && (
              <div>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                  <div>
                    <h6 className="fw-bold mb-0 text-dark">
                      Boletas Registradas en {formatPeriodDisplay(selectedPeriod)}
                    </h6>
                    <small className="text-muted">Listado local de documentos BHE emitidos con éxito.</small>
                  </div>

                  <InputGroup style={{ maxWidth: '320px' }}>
                    <InputGroup.Text className="bg-light border-end-0">
                      <FiSearch className="text-muted" />
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Buscar por folio, cliente, RUT..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-start-0 bg-light"
                      size="sm"
                    />
                  </InputGroup>
                </div>

                {loadingIssued ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" style={{ color: '#c9897a' }} />
                    <p className="text-muted mt-2 small">Cargando boletas emitidas...</p>
                  </div>
                ) : filteredIssued.length === 0 ? (
                  <div className="text-center py-5 border rounded-3 bg-light bg-opacity-50">
                    <span style={{ fontSize: '2.5rem' }}>📄</span>
                    <h5 className="mt-2 fw-bold text-dark">Sin boletas emitidas en este período</h5>
                    <p className="text-muted small mb-0">
                      No se registraron emisiones locales para {formatPeriodDisplay(selectedPeriod)}.
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="align-middle mb-0 border-top">
                      <thead className="table-light small text-muted text-uppercase">
                        <tr>
                          <th>Folio</th>
                          <th>Cita</th>
                          <th>Fecha Emisión</th>
                          <th>Cliente</th>
                          <th>RUT</th>
                          <th>Monto</th>
                          <th>Origen / Correo SII</th>
                          <th className="text-end">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIssued.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <Badge
                                bg={item.siiCode === 'MANUAL' ? 'secondary' : 'dark'}
                                className="font-monospace px-2 py-1"
                              >
                                Folio #{item.invoiceNumber}
                              </Badge>
                              {item.siiCode && item.siiCode !== 'MANUAL' && (
                                <div className="text-muted" style={{ fontSize: '10px' }}>
                                  {item.siiCode}
                                </div>
                              )}
                            </td>
                            <td>
                              {item.appointmentId ? (
                                <span className="fw-semibold text-primary">#{item.appointmentId}</span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>
                              <small className="text-dark">
                                {item.createdAt ? item.createdAt.substring(0, 10) : item.appointmentDate}
                              </small>
                            </td>
                            <td>
                              <div className="fw-semibold text-dark">{item.customerName}</div>
                              <small className="text-muted">{item.customerEmail || 'Sin email'}</small>
                            </td>
                            <td className="font-monospace small">
                              {item.customerRut ? formatRutWithDots(item.customerRut) : '-'}
                            </td>
                            <td className="fw-bold text-dark">{formatCurrencyCLP(item.amountInClp)}</td>
                            <td>
                              {item.siiCode === 'MANUAL' ? (
                                <Badge bg="light" text="dark" className="border">
                                  <FiEdit3 /> Emitida a Mano
                                </Badge>
                              ) : item.emailSent ? (
                                <Badge bg="success" className="d-inline-flex align-items-center gap-1">
                                  <FiCheckCircle /> Enviado
                                </Badge>
                              ) : (
                                <Badge bg="light" text="dark" className="border">
                                  SII (Sin email)
                                </Badge>
                              )}
                            </td>
                            <td className="text-end">
                              <div className="d-flex justify-content-end gap-1">
                                {item.siiCode !== 'MANUAL' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline-secondary"
                                      title="Descargar PDF oficial SII"
                                      onClick={() => handleDownloadPdf(item.siiCode || item.invoiceNumber, item.invoiceNumber)}
                                      disabled={actionLoading || (!item.siiCode && !item.invoiceNumber)}
                                    >
                                      <FiDownload />
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline-info"
                                      title="Reenviar correo oficial SII"
                                      onClick={() => handleOpenResendModal(item)}
                                      disabled={actionLoading || (!item.siiCode && !item.invoiceNumber)}
                                    >
                                      <FiMail />
                                    </Button>
                                  </>
                                )}

                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  title="Anular en el SII"
                                  onClick={() => handleOpenCancelModal(item.invoiceNumber)}
                                  disabled={actionLoading}
                                >
                                  <FiTrash2 />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                TAB 3: CONTRASTE CON EL SII (Bajo Demanda - Ahorro de Créditos)
            ───────────────────────────────────────────────────────────────── */}
            {activeTab === 'contrast' && (
              <div>
                <Alert variant="light" className="border d-flex align-items-start gap-3 mb-4 bg-light bg-opacity-75">
                  <span style={{ fontSize: '1.5rem' }}>💡</span>
                  <div className="small">
                    <strong className="d-block text-dark mb-1">
                      Conciliación Oficial Bajo Demanda (Cuidado de Créditos de API)
                    </strong>
                    Esta vista cruza las boletas registradas en BunnyCure contra los documentos oficiales emitidos
                    reportados directamente por el SII para <strong>{formatPeriodDisplay(selectedPeriod)}</strong>.
                    Para no consumir créditos de tu cuenta en cada navegación, la consulta externa se realiza únicamente
                    cuando presionas el botón y se almacena en caché durante 15 minutos.
                  </div>
                </Alert>

                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
                  <div className="d-flex align-items-center gap-2">
                    <Button
                      variant="primary"
                      style={{ backgroundColor: '#c9897a', borderColor: '#c9897a' }}
                      className="d-flex align-items-center gap-2 shadow-xs fw-semibold"
                      onClick={() => loadContrast(false)}
                      disabled={loadingContrast}
                    >
                      {loadingContrast ? (
                        <>
                          <Spinner size="sm" animation="border" />
                          <span>Consultando SII...</span>
                        </>
                      ) : (
                        <>
                          <FiSearch />
                          <span>Consultar y Contrastar con SII</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => loadContrast(true)}
                      disabled={loadingContrast}
                      title="Fuerza una nueva llamada al SII ignorando la caché (consume 1 crédito de consulta)"
                    >
                      <FiRefreshCw className={loadingContrast ? 'spin' : ''} /> Forzar Recarga Externa
                    </Button>
                  </div>

                  {contrastResult && (
                    <small className="text-muted">
                      Última consulta:{' '}
                      <strong>{new Date(contrastResult.queriedAt).toLocaleTimeString()}</strong>
                      {contrastResult.fromCache && (
                        <Badge bg="light" text="dark" className="ms-2 border">
                          Desde Caché (0 créditos)
                        </Badge>
                      )}
                    </small>
                  )}
                </div>

                {loadingContrast ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" style={{ color: '#c9897a' }} />
                    <p className="text-muted mt-2 small">Cruzando información con los servidores del SII...</p>
                  </div>
                ) : !contrastResult ? (
                  <div className="text-center py-5 border rounded-3 bg-light bg-opacity-50">
                    <span style={{ fontSize: '2.5rem' }}>🔍</span>
                    <h5 className="mt-2 fw-bold text-dark">Consulta de Contraste no realizada</h5>
                    <p className="text-muted small mb-3">
                      Presiona el botón superior para contrastar las boletas de BunnyCure contra el SII en{' '}
                      {formatPeriodDisplay(selectedPeriod)}.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Contrast KPIs */}
                    <Row className="g-3 mb-4">
                      <Col xs={6} md={3}>
                        <div className="p-3 border rounded-3 bg-white text-center shadow-xs">
                          <small className="text-muted text-uppercase fw-bold">Reportadas en SII</small>
                          <h4 className="fw-bold mb-0 text-primary mt-1">{contrastResult.siiTotalCount}</h4>
                          <small className="text-muted">{formatCurrencyCLP(contrastResult.siiTotalAmount)}</small>
                        </div>
                      </Col>

                      <Col xs={6} md={3}>
                        <div className="p-3 border rounded-3 bg-white text-center shadow-xs">
                          <small className="text-muted text-uppercase fw-bold">Emitidas en BunnyCure</small>
                          <h4 className="fw-bold mb-0 text-dark mt-1">{contrastResult.localTotalCount}</h4>
                          <small className="text-muted">{formatCurrencyCLP(contrastResult.localTotalAmount)}</small>
                        </div>
                      </Col>

                      <Col xs={6} md={3}>
                        <div className="p-3 border rounded-3 bg-white text-center shadow-xs">
                          <small className="text-muted text-uppercase fw-bold">Conciliadas Exactas</small>
                          <h4 className="fw-bold mb-0 text-success mt-1">{contrastResult.matchedCount}</h4>
                          <small className="text-success">Coinciden en SII y App</small>
                        </div>
                      </Col>

                      <Col xs={6} md={3}>
                        <div className="p-3 border rounded-3 bg-white text-center shadow-xs">
                          <small className="text-muted text-uppercase fw-bold">Citas Sin Boleta</small>
                          <h4
                            className={`fw-bold mb-0 mt-1 ${
                              contrastResult.pendingEmitCount > 0 ? 'text-danger' : 'text-success'
                            }`}
                          >
                            {contrastResult.pendingEmitCount}
                          </h4>
                          <small className="text-muted">Faltantes por emitir</small>
                        </div>
                      </Col>
                    </Row>

                    {/* Pending appointments missing in period */}
                    {contrastResult.pendingAppointments.length > 0 && (
                      <div className="mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <h6 className="fw-bold text-danger mb-0 d-flex align-items-center gap-1">
                            <FiAlertTriangle /> Citas completadas de {formatPeriodDisplay(selectedPeriod)} sin boleta emitida ({contrastResult.pendingAppointments.length})
                          </h6>
                        </div>
                        <div className="table-responsive border rounded-3">
                          <Table hover className="align-middle mb-0">
                            <thead className="table-light small text-muted">
                              <tr>
                                <th>Cita #</th>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>RUT</th>
                                <th>Monto</th>
                                <th>Estado</th>
                                <th className="text-end">Acción</th>
                              </tr>
                            </thead>
                            <tbody>
                              {contrastResult.pendingAppointments.map((p) => (
                                <tr key={p.appointmentId}>
                                  <td className="fw-bold">#{p.appointmentId}</td>
                                  <td>{p.appointmentDate}</td>
                                  <td>{p.customerName}</td>
                                  <td>
                                    {p.customerRut ? (
                                      formatRutWithDots(p.customerRut)
                                    ) : (
                                      <Badge bg="warning" text="dark">
                                        Sin RUT
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="fw-bold">{formatCurrencyCLP(p.totalAmount)}</td>
                                  <td>
                                    {p.invoiceStatus === 'FAILED' ? (
                                      <Badge bg="danger">Error previo</Badge>
                                    ) : (
                                      <Badge bg="secondary">Sin emitir</Badge>
                                    )}
                                  </td>
                                  <td className="text-end">
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      style={{ backgroundColor: '#c9897a', borderColor: '#c9897a' }}
                                      onClick={() => handleOpenEmitModal(p)}
                                    >
                                      Emitir Ahora
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Local Invoices Reconciliation Status */}
                    <div>
                      <h6 className="fw-bold text-dark mb-2">
                        Estado de Conciliación de Boletas Locales vs SII
                      </h6>
                      <div className="table-responsive border rounded-3">
                        <Table hover className="align-middle mb-0">
                          <thead className="table-light small text-muted">
                            <tr>
                              <th>Folio</th>
                              <th>Fecha</th>
                              <th>Cliente</th>
                              <th>Monto</th>
                              <th>Estado en SII</th>
                              <th className="text-end">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contrastResult.localInvoices.map((inv) => (
                              <tr key={inv.id}>
                                <td className="fw-bold">Folio #{inv.invoiceNumber}</td>
                                <td>{inv.createdAt ? inv.createdAt.substring(0, 10) : inv.appointmentDate}</td>
                                <td>{inv.customerName}</td>
                                <td className="fw-bold">{formatCurrencyCLP(inv.amountInClp)}</td>
                                <td>
                                  <Badge bg="success" className="d-inline-flex align-items-center gap-1">
                                    <FiCheckCircle /> Registrada en SII
                                  </Badge>
                                </td>
                                <td className="text-end">
                                  {inv.siiCode !== 'MANUAL' && (
                                    <Button
                                      size="sm"
                                      variant="outline-secondary"
                                      onClick={() => handleDownloadPdf(inv.siiCode, inv.invoiceNumber)}
                                      disabled={!inv.siiCode}
                                    >
                                      <FiDownload /> PDF
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: EMITIR BOLETA INDIVIDUAL AL SII
      ───────────────────────────────────────────────────────────────── */}
      <Modal show={emitModalOpen} onHide={() => setEmitModalOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2">
            <FiPlusCircle style={{ color: '#c9897a' }} />
            Emitir Boleta de Honorarios en SII
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPending && (
            <div>
              <div className="p-3 bg-light rounded-3 mb-3 border">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted small">Cita:</span>
                  <span className="fw-bold text-dark">#{selectedPending.appointmentId}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted small">Fecha:</span>
                  <span className="text-dark">
                    {selectedPending.appointmentDate} {selectedPending.appointmentTime?.substring(0, 5)}
                  </span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted small">Servicios:</span>
                  <span className="text-dark text-truncate" style={{ maxWidth: '220px' }}>
                    {selectedPending.servicesSummary}
                  </span>
                </div>
                <div className="d-flex justify-content-between border-top pt-2 mt-2">
                  <span className="fw-bold text-dark">Total a Facturar:</span>
                  <span className="fw-bold text-dark fs-5">
                    {formatCurrencyCLP(selectedPending.totalAmount)}
                  </span>
                </div>
              </div>

              {selectedPending.errorMessage && (
                <Alert variant="danger" className="small py-2 mb-3">
                  <strong>Error anterior:</strong> {selectedPending.errorMessage}
                </Alert>
              )}

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-dark">
                  RUT del Cliente <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="Ej: 18.664.589-8"
                  value={editRut}
                  onChange={(e) => setEditRut(e.target.value)}
                  onBlur={() => setEditRut(formatRutWithDots(editRut))}
                  isInvalid={editRut.trim().length > 0 && !isValidRutFormat(formatRutWithDots(editRut))}
                />
                <Form.Control.Feedback type="invalid">
                  Por favor ingresa un RUT válido con dígito verificador.
                </Form.Control.Feedback>
                <Form.Text className="text-muted" style={{ fontSize: '11px' }}>
                  Si el cliente no tenía RUT o estaba mal escrito, puedes corregirlo aquí y se actualizará en su ficha.
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label className="small fw-bold text-dark">Correo Oficial del Cliente (Opcional)</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="cliente@ejemplo.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setEmitModalOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            style={{ backgroundColor: '#c9897a', borderColor: '#c9897a' }}
            onClick={handleConfirmEmit}
            disabled={actionLoading || !editRut.trim()}
          >
            {actionLoading ? (
              <>
                <Spinner size="sm" animation="border" className="me-1" /> Emitiendo en SII...
              </>
            ) : (
              'Confirmar y Emitir BHE'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: MARCAR INDIVIDUAL COMO EMITIDA A MANO (0 Créditos)
      ───────────────────────────────────────────────────────────────── */}
      <Modal show={manualModalOpen} onHide={() => setManualModalOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2">
            <FiEdit3 style={{ color: '#c9897a' }} />
            Marcar Boleta como Emitida a Mano
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {manualPendingItem && (
            <div>
              <Alert variant="info" className="small mb-3">
                <strong>Sin llamada al SII (0 créditos):</strong> Esta opción marca la cita como facturada en el
                sistema registrando el folio que emitiste a mano directamente en el portal del SII.
              </Alert>

              <div className="p-3 bg-light rounded-3 mb-3 border">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted small">Cita:</span>
                  <span className="fw-bold text-dark">#{manualPendingItem.appointmentId}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted small">Cliente:</span>
                  <span className="text-dark fw-semibold">{manualPendingItem.customerName}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Monto Total:</span>
                  <span className="text-dark fw-bold">{formatCurrencyCLP(manualPendingItem.totalAmount)}</span>
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-dark">Número de Folio Manual (Opcional)</Form.Label>
                <Form.Control
                  placeholder="Ej: 1420 (Si lo dejas vacío, se guardará como MANUAL-ID)"
                  value={manualFolio}
                  onChange={(e) => setManualFolio(e.target.value)}
                />
                <Form.Text className="text-muted" style={{ fontSize: '11px' }}>
                  Ingresa el número de folio oficial generado a mano en sii.cl.
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label className="small fw-bold text-dark">Observación / Nota</Form.Label>
                <Form.Control
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Nota interna de la emisión manual..."
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setManualModalOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleConfirmManual} disabled={actionLoading}>
            {actionLoading ? <Spinner size="sm" animation="border" /> : 'Confirmar Registro Manual'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: MARCAR LOTE COMO EMITIDAS A MANO (Batch 0 Créditos)
      ───────────────────────────────────────────────────────────────── */}
      <Modal show={batchManualModalOpen} onHide={() => setBatchManualModalOpen(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2">
            <FiLayers style={{ color: '#28a745' }} />
            Marcar {selectedAppointmentIds.length} Citas como Emitidas a Mano
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="success" className="small mb-3">
            <strong>Registro Masivo Local (0 créditos):</strong> Se registrarán las{' '}
            <strong>{selectedAppointmentIds.length} citas</strong> seleccionadas como emitidas con éxito en la base de
            datos de BunnyCure.
          </Alert>

          <div className="p-3 bg-light rounded-3 mb-3 border">
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted small">Citas seleccionadas:</span>
              <span className="fw-bold text-dark">{selectedAppointmentIds.length} citas</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="text-muted small">Monto acumulado total:</span>
              <span className="fw-bold text-success fs-5">{formatCurrencyCLP(selectedTotalAmount)}</span>
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold text-dark">
              Folio Inicial Consecutivo (Opcional)
            </Form.Label>
            <Form.Control
              placeholder="Ej: 1400 (Asignará 1400, 1401, 1402... correlativamente)"
              value={batchInitialFolio}
              onChange={(e) => setBatchInitialFolio(e.target.value)}
            />
            <Form.Text className="text-muted" style={{ fontSize: '11px' }}>
              Si dejas este campo vacío, cada cita se guardará con identificador MANUAL-ID.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="small fw-bold text-dark">Nota General del Lote</Form.Label>
            <Form.Control
              value={batchManualNotes}
              onChange={(e) => setBatchManualNotes(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setBatchManualModalOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleConfirmBatchManual} disabled={actionLoading}>
            {actionLoading ? (
              <>
                <Spinner size="sm" animation="border" className="me-1" /> Procesando {selectedAppointmentIds.length} citas...
              </>
            ) : (
              `Confirmar Marcado de ${selectedAppointmentIds.length} Boletas`
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: EMISIÓN MASIVA AL SII (Batch Emit)
      ───────────────────────────────────────────────────────────────── */}
      <Modal show={batchEmitModalOpen} onHide={() => setBatchEmitModalOpen(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2">
            <FiSend style={{ color: '#c9897a' }} />
            Emitir {selectedAppointmentIds.length} Boletas en el SII
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="small mb-3">
            <strong>Atención:</strong> Esta acción enviará secuencialmente cada una de las{' '}
            <strong>{selectedAppointmentIds.length} citas seleccionadas</strong> al servicio de emisión de BHE del SII.
          </Alert>

          <div className="p-3 bg-light rounded-3 mb-3 border">
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted small">Total Citas a Emitir:</span>
              <span className="fw-bold text-dark">{selectedAppointmentIds.length}</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted small">Citas con RUT Válido:</span>
              <span className="fw-bold text-success">
                {selectedValidRutsCount} de {selectedAppointmentIds.length}
              </span>
            </div>
            <div className="d-flex justify-content-between border-top pt-2 mt-2">
              <span className="fw-bold text-dark">Monto Total a Facturar:</span>
              <span className="fw-bold text-dark fs-5">{formatCurrencyCLP(selectedTotalAmount)}</span>
            </div>
          </div>

          {selectedValidRutsCount < selectedAppointmentIds.length && (
            <Alert variant="danger" className="small py-2 mb-0">
              <strong>Advertencia:</strong> Hay {selectedAppointmentIds.length - selectedValidRutsCount} citas sin RUT
              válido. Esas citas no podrán emitirse en el SII y reportarán error. Te recomendamos editarlas individualmente o deseleccionarlas antes de emitir en lote.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setBatchEmitModalOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            style={{ backgroundColor: '#c9897a', borderColor: '#c9897a' }}
            onClick={handleConfirmBatchEmit}
            disabled={actionLoading || selectedAppointmentIds.length === 0}
          >
            {actionLoading ? (
              <>
                <Spinner size="sm" animation="border" className="me-1" /> Emitiendo en SII...
              </>
            ) : (
              `Comenzar Emisión en SII (${selectedAppointmentIds.length})`
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: REENVIAR CORREO SII
      ───────────────────────────────────────────────────────────────── */}
      <Modal show={resendModalOpen} onHide={() => setResendModalOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2">
            <FiMail style={{ color: '#c9897a' }} />
            Reenviar Correo Oficial SII
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedIssued && (
            <div>
              <p className="small text-muted mb-3">
                Se solicitará al servidor del SII que despache nuevamente el correo electrónico oficial con el PDF y
                XML adjuntos para la boleta <strong>Folio #{selectedIssued.invoiceNumber}</strong>.
              </p>

              <Form.Group>
                <Form.Label className="small fw-bold text-dark">Destinatario:</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={resendEmailTarget}
                  onChange={(e) => setResendEmailTarget(e.target.value)}
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setResendModalOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            style={{ backgroundColor: '#c9897a', borderColor: '#c9897a' }}
            onClick={handleConfirmResend}
            disabled={actionLoading}
          >
            {actionLoading ? <Spinner size="sm" animation="border" /> : 'Reenviar Correo'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: ANULAR BOLETA EN EL SII
      ───────────────────────────────────────────────────────────────── */}
      <Modal show={cancelModalOpen} onHide={() => setCancelModalOpen(false)} centered>
        <Modal.Header closeButton className="border-danger">
          <Modal.Title className="h5 fw-bold text-danger d-flex align-items-center gap-2">
            <FiAlertTriangle />
            Anular Boleta de Honorarios en el SII
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="small">
            <strong>Atención:</strong> Esta acción anulará definitivamente la boleta <strong>Folio #{cancelFolio}</strong> directamente en la plataforma del SII.
          </Alert>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold text-dark">Causa de Anulación:</Form.Label>
            <Form.Select value={cancelCause} onChange={(e) => setCancelCause(e.target.value)}>
              {SII_CANCEL_CAUSES.map((cause) => (
                <option key={cause.value} value={cause.value}>
                  {cause.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setCancelModalOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmCancel} disabled={actionLoading}>
            {actionLoading ? <Spinner size="sm" animation="border" /> : 'Confirmar Anulación en SII'}
          </Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  );
}
