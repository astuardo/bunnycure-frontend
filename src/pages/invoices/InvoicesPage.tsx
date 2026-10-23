import { useEffect, useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';

// Format period for display (e.g. 202609 -> Septiembre 2026)
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

  // Dynamic available periods (current month and past 18 months)
  const availablePeriods = useMemo(() => {
    const periods: Array<{ value: string; label: string }> = [];
    const now = new Date();
    for (let i = 0; i < 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${year}${month}`;
      periods.push({
        value: val,
        label: formatPeriodDisplay(val),
      });
    }
    if (selectedPeriod && !periods.some((p) => p.value === selectedPeriod)) {
      periods.unshift({
        value: selectedPeriod,
        label: formatPeriodDisplay(selectedPeriod),
      });
    }
    return periods;
  }, [selectedPeriod]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload period dependent data
  useEffect(() => {
    if (activeTab === 'issued') {
      loadIssued();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedPeriod]);

  // Reset contrast data when changing period to avoid showing stale data from previous period
  useEffect(() => {
    setContrastResult(null);
  }, [selectedPeriod]);

  const handleRefreshAll = () => {
    loadSummary();
    if (activeTab === 'pending') loadPending();
    if (activeTab === 'issued') loadIssued();
    if (activeTab === 'contrast') loadContrast(false);
  };

  // ─── Filtered Data ─────────────────────────────────────────────────────────

  const filteredPending = useMemo(() => {
    return pendingList.filter((item) => {
      if (pendingFilter === 'ERRORS' && item.invoiceStatus !== 'FAILED') return false;
      if (pendingFilter === 'NO_RUT' && item.rutStatus === 'VALID') return false;

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

  const isAllFilteredSelected =
    filteredPending.length > 0 &&
    filteredPending.every((item) => selectedAppointmentIds.includes(item.appointmentId));

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-bunny-text tracking-tight flex items-center gap-2">
              <span>🧾</span> Boletas SII (BHE)
            </h1>
            <p className="text-sm text-bunny-text-muted mt-1">
              Trazabilidad de boletas por emitir, selección múltiple, emisión manual y contraste oficial con el SII.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period selector */}
            <div className="flex items-center gap-1.5 bg-white border border-bunny-border rounded-xl px-3 py-1.5 shadow-sm text-xs">
              <span className="text-bunny-text-muted font-bold">Período:</span>
              <select
                className="border-0 bg-transparent font-semibold text-bunny-text focus:outline-none cursor-pointer"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                {availablePeriods.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={loadingSummary || loadingPending || loadingIssued || loadingContrast}
              leftIcon={<FiRefreshCw className={loadingSummary || loadingPending ? 'animate-spin' : ''} />}
            >
              Actualizar
            </Button>

            {summary?.apiGatewayConfigured ? (
              <Badge variant="success" className="px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                <FiCheckCircle /> SII Conectado
              </Badge>
            ) : (
              <Badge variant="warning" className="px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                <FiAlertTriangle /> Modo Pruebas (Dry-Run)
              </Badge>
            )}
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <Card.Body className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-bunny-text-muted font-bold uppercase tracking-wider">
                  Boletas Emitidas (Mes)
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <FiFileText size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-bunny-text mb-1">
                {summary ? summary.generatedThisMonth : <Spinner size="sm" />}
              </h3>
              <p className="text-xs text-emerald-700 font-semibold">
                Total facturado: {summary ? formatCurrencyCLP(summary.totalAmountMonth) : '$0'}
              </p>
            </Card.Body>
          </Card>

          <Card className={summary && summary.pendingInvoicesCount > 0 ? 'border-amber-300 ring-1 ring-amber-300' : ''}>
            <Card.Body className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-bunny-text-muted font-bold uppercase tracking-wider">
                  Por Emitir / Faltantes
                </span>
                <div
                  className={`p-2 rounded-xl ${
                    summary && summary.pendingInvoicesCount > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-bunny-sand text-bunny-text-muted'
                  }`}
                >
                  <FiAlertTriangle size={18} />
                </div>
              </div>
              <h3
                className={`text-2xl font-bold mb-1 ${
                  summary && summary.pendingInvoicesCount > 0 ? 'text-amber-800' : 'text-bunny-text'
                }`}
              >
                {summary ? summary.pendingInvoicesCount : <Spinner size="sm" />}
              </h3>
              <p className="text-xs text-bunny-text-muted">
                {summary && summary.failedInvoicesCount > 0
                  ? `${summary.failedInvoicesCount} con error previo`
                  : 'Citas completadas'}
              </p>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-bunny-text-muted font-bold uppercase tracking-wider">
                  Envío Automático Email
                </span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                  <FiMail size={18} />
                </div>
              </div>
              <h3 className="text-lg font-bold text-bunny-text mb-1">
                {summary?.sendEmailEnabled ? 'Habilitado' : 'Desactivado (Manual)'}
              </h3>
              <p className="text-xs text-bunny-text-muted">
                {summary?.sendEmailEnabled ? 'Despacho automático' : 'Emisión sin correo automático'}
              </p>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-bunny-text-muted font-bold uppercase tracking-wider">
                  RUT Emisor SII
                </span>
                <div className="p-2 rounded-xl bg-bunny-sand text-bunny-text">
                  <FiShield size={18} />
                </div>
              </div>
              <h3 className="text-lg font-bold text-bunny-text mb-1 truncate">
                {summary?.emisorRut ? formatRutWithDots(summary.emisorRut) : 'No configurado'}
              </h3>
              <p className="text-xs text-bunny-text-muted">2da Categoría - Retención Emisor</p>
            </Card.Body>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Card>
          <Card.Header className="p-3 bg-white">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'pending'
                    ? 'bg-bunny-primary text-white shadow-sm'
                    : 'text-bunny-text hover:bg-bunny-paper'
                }`}
              >
                <FiAlertTriangle />
                <span>Boletas por Emitir</span>
                {pendingList.length > 0 && (
                  <Badge variant={activeTab === 'pending' ? 'neutral' : 'warning'}>
                    {pendingList.length}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('issued')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'issued'
                    ? 'bg-bunny-primary text-white shadow-sm'
                    : 'text-bunny-text hover:bg-bunny-paper'
                }`}
              >
                <FiFileText />
                <span>Boletas Emitidas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('contrast')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'contrast'
                    ? 'bg-bunny-primary text-white shadow-sm'
                    : 'text-bunny-text hover:bg-bunny-paper'
                }`}
              >
                <FiRefreshCw />
                <span>Contraste con el SII</span>
              </button>
            </div>
          </Card.Header>

          <Card.Body className="p-4">
            {/* TAB 1: BOLETAS PENDIENTES */}
            {activeTab === 'pending' && (
              <div className="space-y-4">
                {/* Floating Batch Action Banner */}
                {selectedAppointmentIds.length > 0 && (
                  <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="warning" className="text-sm px-3 py-1 font-bold">
                        {selectedAppointmentIds.length} seleccionadas
                      </Badge>
                      <span className="text-xs text-bunny-text-muted/70">
                        Monto total: <strong className="text-white">{formatCurrencyCLP(selectedTotalAmount)}</strong> | RUTs válidos:{' '}
                        <strong className="text-white">
                          {selectedValidRutsCount}/{selectedAppointmentIds.length}
                        </strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        leftIcon={<FiEdit3 />}
                        onClick={handleOpenBatchManualModal}
                      >
                        Marcar a Mano ({selectedAppointmentIds.length})
                      </Button>

                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<FiSend />}
                        onClick={handleOpenBatchEmitModal}
                      >
                        Emitir al SII ({selectedAppointmentIds.length})
                      </Button>

                      <button
                        type="button"
                        onClick={() => setSelectedAppointmentIds([])}
                        title="Deseleccionar todo"
                        className="p-1.5 rounded-lg text-bunny-text-muted/70 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <FiX size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Filters and search */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-bunny-text-muted font-bold uppercase">Filtro:</span>
                    <button
                      type="button"
                      onClick={() => setPendingFilter('ALL')}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                        pendingFilter === 'ALL'
                          ? 'bg-bunny-text text-white'
                          : 'bg-bunny-sand text-bunny-text hover:bg-bunny-border'
                      }`}
                    >
                      Todas ({pendingList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingFilter('ERRORS')}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                        pendingFilter === 'ERRORS'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      Con Error ({pendingList.filter((i) => i.invoiceStatus === 'FAILED').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingFilter('NO_RUT')}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                        pendingFilter === 'NO_RUT'
                          ? 'bg-amber-500 text-white'
                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      Sin RUT o Inválido ({pendingList.filter((i) => i.rutStatus !== 'VALID').length})
                    </button>
                  </div>

                  <div className="relative w-full md:w-72">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bunny-text-muted" />
                    <input
                      type="text"
                      placeholder="Buscar por cliente, RUT o ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-bunny-border bg-bunny-paper focus:bg-white focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                    />
                  </div>
                </div>

                {loadingPending ? (
                  <div className="text-center py-12 text-bunny-text-muted">
                    <Spinner size="md" className="mx-auto mb-2" />
                    <p className="text-xs">Cargando citas por emitir...</p>
                  </div>
                ) : filteredPending.length === 0 ? (
                  <div className="text-center py-12 border border-bunny-border rounded-2xl bg-bunny-paper/30">
                    <span className="text-3xl">✨</span>
                    <h4 className="mt-2 text-sm font-bold text-bunny-text">¡Todo al día!</h4>
                    <p className="text-xs text-bunny-text-muted mt-0.5">
                      No hay citas completadas pendientes de emisión de boleta que coincidan con el filtro.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-bunny-border rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-bunny-paper/60 text-bunny-text-muted font-semibold border-b border-bunny-border uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-3 text-center w-10">
                            <input
                              type="checkbox"
                              className="rounded border-bunny-border text-bunny-primary focus:ring-bunny-primary/30"
                              checked={isAllFilteredSelected}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              title="Seleccionar todas las visibles"
                            />
                          </th>
                          <th className="py-3 px-3">Cita #</th>
                          <th className="py-3 px-3">Fecha / Hora</th>
                          <th className="py-3 px-3">Cliente</th>
                          <th className="py-3 px-3">RUT Cliente</th>
                          <th className="py-3 px-3">Servicios</th>
                          <th className="py-3 px-3">Monto</th>
                          <th className="py-3 px-3">Diagnóstico / Estado</th>
                          <th className="py-3 px-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bunny-border/30">
                        {filteredPending.map((item) => {
                          const isSelected = selectedAppointmentIds.includes(item.appointmentId);
                          return (
                            <tr key={item.appointmentId} className={`hover:bg-bunny-paper/40 transition-colors ${isSelected ? 'bg-bunny-primary-light/30' : ''}`}>
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-bunny-border text-bunny-primary focus:ring-bunny-primary/30"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectOne(item.appointmentId)}
                                />
                              </td>
                              <td className="py-3 px-3 font-bold text-bunny-text">#{item.appointmentId}</td>
                              <td className="py-3 px-3">
                                <div>{item.appointmentDate}</div>
                                <span className="text-bunny-text-muted">{item.appointmentTime?.substring(0, 5)}</span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-bunny-text">{item.customerName}</div>
                                <span className="text-bunny-text-muted">{item.customerEmail || 'Sin correo'}</span>
                              </td>
                              <td className="py-3 px-3">
                                {item.customerRut ? (
                                  <Badge
                                    variant={item.rutStatus === 'VALID' ? 'success' : 'danger'}
                                    className="font-mono text-xs"
                                  >
                                    {formatRutWithDots(item.customerRut)}
                                  </Badge>
                                ) : (
                                  <Badge variant="warning">
                                    Falta RUT
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3 px-3 max-w-[200px] truncate" title={item.servicesSummary}>
                                {item.servicesSummary}
                              </td>
                              <td className="py-3 px-3 font-bold text-bunny-text">{formatCurrencyCLP(item.totalAmount)}</td>
                              <td className="py-3 px-3">
                                {item.invoiceStatus === 'FAILED' ? (
                                  <div className="space-y-0.5">
                                    <Badge variant="danger" className="flex items-center gap-1 w-fit">
                                      <FiXCircle /> Error al emitir
                                    </Badge>
                                    <div
                                      className="text-rose-600 truncate max-w-[200px]"
                                      title={item.errorMessage || ''}
                                    >
                                      {item.errorMessage || 'Error en comunicación con SII'}
                                    </div>
                                  </div>
                                ) : item.rutStatus !== 'VALID' ? (
                                  <Badge variant="warning">
                                    Requiere RUT válido
                                  </Badge>
                                ) : (
                                  <Badge variant="neutral" className="flex items-center gap-1 w-fit">
                                    <FiClock /> Sin emitir
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenEmitModal(item)}
                                    leftIcon={<FiSend size={12} />}
                                  >
                                    Emitir
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenManualModal(item)}
                                    title="Marcar como emitida a mano (0 créditos)"
                                    leftIcon={<FiEdit3 size={12} />}
                                  >
                                    A Mano
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: BOLETAS EMITIDAS */}
            {activeTab === 'issued' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-bunny-text">
                      Boletas Registradas en {formatPeriodDisplay(selectedPeriod)}
                    </h3>
                    <p className="text-xs text-bunny-text-muted mt-0.5">
                      Listado local de documentos BHE emitidos con éxito.
                    </p>
                  </div>

                  <div className="relative w-full md:w-72">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bunny-text-muted" />
                    <input
                      type="text"
                      placeholder="Buscar por folio, cliente, RUT..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-bunny-border bg-bunny-paper focus:bg-white focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                    />
                  </div>
                </div>

                {loadingIssued ? (
                  <div className="text-center py-12 text-bunny-text-muted">
                    <Spinner size="md" className="mx-auto mb-2" />
                    <p className="text-xs">Cargando boletas emitidas...</p>
                  </div>
                ) : filteredIssued.length === 0 ? (
                  <div className="text-center py-12 border border-bunny-border rounded-2xl bg-bunny-paper/30">
                    <span className="text-3xl">📄</span>
                    <h4 className="mt-2 text-sm font-bold text-bunny-text">Sin boletas emitidas en este período</h4>
                    <p className="text-xs text-bunny-text-muted mt-0.5">
                      No se registraron emisiones locales para {formatPeriodDisplay(selectedPeriod)}.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-bunny-border rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-bunny-paper/60 text-bunny-text-muted font-semibold border-b border-bunny-border uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-3">Folio</th>
                          <th className="py-3 px-3">Cita</th>
                          <th className="py-3 px-3">Fecha Emisión</th>
                          <th className="py-3 px-3">Cliente</th>
                          <th className="py-3 px-3">RUT</th>
                          <th className="py-3 px-3">Monto</th>
                          <th className="py-3 px-3">Origen / Correo SII</th>
                          <th className="py-3 px-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bunny-border/30">
                        {filteredIssued.map((item) => (
                          <tr key={item.id} className="hover:bg-bunny-paper/40 transition-colors">
                            <td className="py-3 px-3">
                              <Badge
                                variant={item.siiCode === 'MANUAL' ? 'neutral' : 'primary'}
                                className="font-mono text-xs"
                              >
                                Folio #{item.invoiceNumber}
                              </Badge>
                              {item.siiCode && item.siiCode !== 'MANUAL' && (
                                <div className="text-bunny-text-muted text-[10px] mt-0.5">{item.siiCode}</div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {item.appointmentId ? (
                                <span className="font-semibold text-bunny-primary">#{item.appointmentId}</span>
                              ) : (
                                <span className="text-bunny-text-muted">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {item.createdAt ? item.createdAt.substring(0, 10) : item.appointmentDate}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-bunny-text">{item.customerName}</div>
                              <span className="text-bunny-text-muted">{item.customerEmail || 'Sin email'}</span>
                            </td>
                            <td className="py-3 px-3 font-mono">
                              {item.customerRut ? formatRutWithDots(item.customerRut) : '-'}
                            </td>
                            <td className="py-3 px-3 font-bold text-bunny-text">{formatCurrencyCLP(item.amountInClp)}</td>
                            <td className="py-3 px-3">
                              {item.siiCode === 'MANUAL' ? (
                                <Badge variant="neutral" className="flex items-center gap-1 w-fit">
                                  <FiEdit3 /> Emitida a Mano
                                </Badge>
                              ) : item.emailSent ? (
                                <Badge variant="success" className="flex items-center gap-1 w-fit">
                                  <FiCheckCircle /> Enviado
                                </Badge>
                              ) : (
                                <Badge variant="neutral">
                                  SII (Sin email)
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                {item.siiCode !== 'MANUAL' && (
                                  <>
                                    <button
                                      type="button"
                                      className="p-1.5 rounded-lg border border-bunny-border text-bunny-text hover:bg-bunny-paper transition-colors disabled:opacity-50"
                                      title="Descargar PDF oficial SII"
                                      onClick={() => handleDownloadPdf(item.siiCode || item.invoiceNumber, item.invoiceNumber)}
                                      disabled={actionLoading || (!item.siiCode && !item.invoiceNumber)}
                                    >
                                      <FiDownload size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="p-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-50"
                                      title="Reenviar correo oficial SII"
                                      onClick={() => handleOpenResendModal(item)}
                                      disabled={actionLoading || (!item.siiCode && !item.invoiceNumber)}
                                    >
                                      <FiMail size={14} />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                                  title="Anular en el SII"
                                  onClick={() => handleOpenCancelModal(item.invoiceNumber)}
                                  disabled={actionLoading}
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CONTRASTE CON EL SII */}
            {activeTab === 'contrast' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-bunny-border bg-bunny-paper/40 flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div className="text-xs text-bunny-text">
                    <strong className="block text-bunny-text-title mb-1 font-bold">
                      Conciliación Oficial Bajo Demanda (Cuidado de Créditos de API)
                    </strong>
                    Esta vista cruza las boletas registradas en BunnyCure contra los documentos oficiales emitidos
                    reportados directamente por el SII para <strong>{formatPeriodDisplay(selectedPeriod)}</strong>.
                    Para no consumir créditos de tu cuenta en cada navegación, la consulta externa se realiza únicamente
                    cuando presionas el botón y se almacena en caché durante 15 minutos.
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => loadContrast(false)}
                      disabled={loadingContrast}
                      isLoading={loadingContrast}
                      leftIcon={<FiSearch />}
                    >
                      Consultar y Contrastar con SII
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadContrast(true)}
                      disabled={loadingContrast}
                      title="Fuerza una nueva llamada al SII ignorando la caché (consume 1 crédito de consulta)"
                      leftIcon={<FiRefreshCw className={loadingContrast ? 'animate-spin' : ''} />}
                    >
                      Forzar Recarga Externa
                    </Button>
                  </div>

                  {contrastResult && (
                    <div className="text-xs text-bunny-text-muted">
                      Última consulta:{' '}
                      <strong className="font-mono text-bunny-text">
                        {new Date(contrastResult.queriedAt).toLocaleTimeString()}
                      </strong>
                      {contrastResult.fromCache && (
                        <Badge variant="neutral" className="ml-2">
                          Desde Caché (0 créditos)
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {loadingContrast ? (
                  <div className="text-center py-12 text-bunny-text-muted">
                    <Spinner size="md" className="mx-auto mb-2" />
                    <p className="text-xs">Cruzando información con los servidores del SII...</p>
                  </div>
                ) : !contrastResult ? (
                  <div className="text-center py-12 border border-bunny-border rounded-2xl bg-bunny-paper/30">
                    <span className="text-3xl">🔍</span>
                    <h4 className="mt-2 text-sm font-bold text-bunny-text">Consulta de Contraste no realizada</h4>
                    <p className="text-xs text-bunny-text-muted mt-0.5">
                      Presiona el botón superior para contrastar las boletas de BunnyCure contra el SII en{' '}
                      {formatPeriodDisplay(selectedPeriod)}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Contrast KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 border border-bunny-border rounded-xl bg-white text-center shadow-sm">
                        <span className="text-xs text-bunny-text-muted uppercase font-bold block">Reportadas en SII</span>
                        <h4 className="text-2xl font-bold text-bunny-primary mt-1">{contrastResult.siiTotalCount}</h4>
                        <span className="text-xs text-bunny-text-muted">{formatCurrencyCLP(contrastResult.siiTotalAmount)}</span>
                      </div>

                      <div className="p-4 border border-bunny-border rounded-xl bg-white text-center shadow-sm">
                        <span className="text-xs text-bunny-text-muted uppercase font-bold block">Emitidas en BunnyCure</span>
                        <h4 className="text-2xl font-bold text-bunny-text mt-1">{contrastResult.localTotalCount}</h4>
                        <span className="text-xs text-bunny-text-muted">{formatCurrencyCLP(contrastResult.localTotalAmount)}</span>
                      </div>

                      <div className="p-4 border border-bunny-border rounded-xl bg-white text-center shadow-sm">
                        <span className="text-xs text-bunny-text-muted uppercase font-bold block">Conciliadas Exactas</span>
                        <h4 className="text-2xl font-bold text-emerald-700 mt-1">{contrastResult.matchedCount}</h4>
                        <span className="text-xs text-emerald-700 font-semibold">Coinciden en SII y App</span>
                      </div>

                      <div className="p-4 border border-bunny-border rounded-xl bg-white text-center shadow-sm">
                        <span className="text-xs text-bunny-text-muted uppercase font-bold block">Citas Sin Boleta</span>
                        <h4
                          className={`text-2xl font-bold mt-1 ${
                            contrastResult.pendingEmitCount > 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {contrastResult.pendingEmitCount}
                        </h4>
                        <span className="text-xs text-bunny-text-muted">Faltantes por emitir</span>
                      </div>
                    </div>

                    {/* Pending appointments in contrast */}
                    {contrastResult.pendingAppointments.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                          <FiAlertTriangle /> Citas completadas de {formatPeriodDisplay(selectedPeriod)} sin boleta emitida ({contrastResult.pendingAppointments.length})
                        </h4>
                        <div className="overflow-x-auto border border-bunny-border rounded-xl">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-bunny-paper/60 text-bunny-text-muted font-semibold border-b border-bunny-border uppercase tracking-wider">
                              <tr>
                                <th className="py-2.5 px-3">Cita #</th>
                                <th className="py-2.5 px-3">Fecha</th>
                                <th className="py-2.5 px-3">Cliente</th>
                                <th className="py-2.5 px-3">RUT</th>
                                <th className="py-2.5 px-3">Monto</th>
                                <th className="py-2.5 px-3">Estado</th>
                                <th className="py-2.5 px-3 text-right">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-bunny-border/30">
                              {contrastResult.pendingAppointments.map((p) => (
                                <tr key={p.appointmentId} className="hover:bg-bunny-paper/40">
                                  <td className="py-2.5 px-3 font-bold text-bunny-text">#{p.appointmentId}</td>
                                  <td className="py-2.5 px-3">{p.appointmentDate}</td>
                                  <td className="py-2.5 px-3 font-semibold text-bunny-text">{p.customerName}</td>
                                  <td className="py-2.5 px-3 font-mono">
                                    {p.customerRut ? formatRutWithDots(p.customerRut) : <Badge variant="warning">Sin RUT</Badge>}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-bunny-text">{formatCurrencyCLP(p.totalAmount)}</td>
                                  <td className="py-2.5 px-3">
                                    {p.invoiceStatus === 'FAILED' ? (
                                      <Badge variant="danger">Error previo</Badge>
                                    ) : (
                                      <Badge variant="neutral">Sin emitir</Badge>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <Button size="sm" onClick={() => handleOpenEmitModal(p)}>
                                      Emitir Ahora
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Local Invoices Reconciliation Status */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-bunny-text uppercase tracking-wider">
                        Estado de Conciliación de Boletas Locales vs SII
                      </h4>
                      <div className="overflow-x-auto border border-bunny-border rounded-xl">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-bunny-paper/60 text-bunny-text-muted font-semibold border-b border-bunny-border uppercase tracking-wider">
                            <tr>
                              <th className="py-2.5 px-3">Folio</th>
                              <th className="py-2.5 px-3">Fecha</th>
                              <th className="py-2.5 px-3">Cliente</th>
                              <th className="py-2.5 px-3">Monto</th>
                              <th className="py-2.5 px-3">Estado en SII</th>
                              <th className="py-2.5 px-3 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-bunny-border/30">
                            {contrastResult.localInvoices.map((inv) => (
                              <tr key={inv.id} className="hover:bg-bunny-paper/40">
                                <td className="py-2.5 px-3 font-mono font-bold text-bunny-text">Folio #{inv.invoiceNumber}</td>
                                <td className="py-2.5 px-3">{inv.createdAt ? inv.createdAt.substring(0, 10) : inv.appointmentDate}</td>
                                <td className="py-2.5 px-3 font-semibold text-bunny-text">{inv.customerName}</td>
                                <td className="py-2.5 px-3 font-bold text-bunny-text">{formatCurrencyCLP(inv.amountInClp)}</td>
                                <td className="py-2.5 px-3">
                                  <Badge variant="success" className="flex items-center gap-1 w-fit">
                                    <FiCheckCircle /> Registrada en SII
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {inv.siiCode !== 'MANUAL' && (
                                    <button
                                      type="button"
                                      className="p-1.5 rounded-lg border border-bunny-border text-bunny-text hover:bg-bunny-paper transition-colors disabled:opacity-50"
                                      onClick={() => handleDownloadPdf(inv.siiCode, inv.invoiceNumber)}
                                      disabled={!inv.siiCode}
                                      title="Descargar PDF"
                                    >
                                      <FiDownload size={14} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>

      {/* MODAL: EMITIR BOLETA INDIVIDUAL AL SII */}
      <Modal show={emitModalOpen} onHide={() => setEmitModalOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="flex items-center gap-2">
            <FiPlusCircle className="text-bunny-primary" />
            Emitir Boleta de Honorarios en SII
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          {selectedPending && (
            <div className="space-y-4">
              <div className="p-4 bg-bunny-paper rounded-xl border border-bunny-border space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-bunny-text-muted">Cita:</span>
                  <span className="font-bold text-bunny-text">#{selectedPending.appointmentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bunny-text-muted">Fecha:</span>
                  <span className="text-bunny-text">
                    {selectedPending.appointmentDate} {selectedPending.appointmentTime?.substring(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bunny-text-muted">Servicios:</span>
                  <span className="text-bunny-text truncate max-w-[200px]">{selectedPending.servicesSummary}</span>
                </div>
                <div className="flex justify-between border-t border-bunny-border pt-2">
                  <span className="font-bold text-bunny-text">Total a Facturar:</span>
                  <span className="font-bold text-bunny-primary text-base">
                    {formatCurrencyCLP(selectedPending.totalAmount)}
                  </span>
                </div>
              </div>

              {selectedPending.errorMessage && (
                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
                  <strong>Error anterior:</strong> {selectedPending.errorMessage}
                </div>
              )}

              <div>
                <label htmlFor="invoices-rut-del-cliente" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                  RUT del Cliente <span className="text-rose-600">*</span>
                </label>
                <input id="invoices-rut-del-cliente"
                  type="text"
                  placeholder="Ej: 18.664.589-8"
                  value={editRut}
                  onChange={(e) => setEditRut(e.target.value)}
                  onBlur={() => setEditRut(formatRutWithDots(editRut))}
                  className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                />
                <small className="text-bunny-text-muted mt-1 block">
                  Si el cliente no tenía RUT o estaba mal escrito, puedes corregirlo aquí y se actualizará en su ficha.
                </small>
              </div>

              <div>
                <label htmlFor="invoices-correo-oficial-del-cliente" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                  Correo Oficial del Cliente (Opcional)
                </label>
                <input id="invoices-correo-oficial-del-cliente"
                  type="email"
                  placeholder="cliente@ejemplo.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                />
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setEmitModalOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmEmit}
            disabled={actionLoading || !editRut.trim()}
            isLoading={actionLoading}
          >
            Confirmar y Emitir BHE
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL: MARCAR INDIVIDUAL COMO EMITIDA A MANO */}
      <Modal show={manualModalOpen} onHide={() => setManualModalOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="flex items-center gap-2">
            <FiEdit3 className="text-bunny-primary" />
            Marcar Boleta como Emitida a Mano
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          {manualPendingItem && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl border border-purple-200 bg-purple-50 text-purple-900 text-xs">
                <strong>Sin llamada al SII (0 créditos):</strong> Esta opción marca la cita como facturada en el
                sistema registrando el folio que emitiste a mano directamente en el portal del SII.
              </div>

              <div className="p-3 bg-bunny-paper rounded-xl border border-bunny-border space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-bunny-text-muted">Cita:</span>
                  <span className="font-bold text-bunny-text">#{manualPendingItem.appointmentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bunny-text-muted">Cliente:</span>
                  <span className="font-semibold text-bunny-text">{manualPendingItem.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bunny-text-muted">Monto Total:</span>
                  <span className="font-bold text-bunny-text">{formatCurrencyCLP(manualPendingItem.totalAmount)}</span>
                </div>
              </div>

              <div>
                <label htmlFor="invoices-numero-de-folio-manual" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                  Número de Folio Manual (Opcional)
                </label>
                <input id="invoices-numero-de-folio-manual"
                  type="text"
                  placeholder="Ej: 1420 (Si lo dejas vacío, se guardará como MANUAL-ID)"
                  value={manualFolio}
                  onChange={(e) => setManualFolio(e.target.value)}
                  className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                />
              </div>

              <div>
                <label htmlFor="invoices-observacion-nota" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                  Observación / Nota
                </label>
                <input id="invoices-observacion-nota"
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Nota interna de la emisión manual..."
                  className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                />
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setManualModalOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleConfirmManual} disabled={actionLoading} isLoading={actionLoading}>
            Confirmar Registro Manual
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL: MARCAR LOTE COMO EMITIDAS A MANO */}
      <Modal show={batchManualModalOpen} onHide={() => setBatchManualModalOpen(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="flex items-center gap-2">
            <FiLayers className="text-emerald-600" />
            Marcar {selectedAppointmentIds.length} Citas como Emitidas a Mano
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs">
            <strong>Registro Masivo Local (0 créditos):</strong> Se registrarán las{' '}
            <strong>{selectedAppointmentIds.length} citas</strong> seleccionadas como emitidas con éxito en la base de
            datos de BunnyCure.
          </div>

          <div className="p-4 bg-bunny-paper rounded-xl border border-bunny-border space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-bunny-text-muted">Citas seleccionadas:</span>
              <span className="font-bold text-bunny-text">{selectedAppointmentIds.length} citas</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bunny-text-muted">Monto acumulado total:</span>
              <span className="font-bold text-emerald-700 text-base">{formatCurrencyCLP(selectedTotalAmount)}</span>
            </div>
          </div>

          <div>
            <label htmlFor="invoices-folio-inicial-consecutivo-opcional" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
              Folio Inicial Consecutivo (Opcional)
            </label>
            <input id="invoices-folio-inicial-consecutivo-opcional"
              type="text"
              placeholder="Ej: 1400 (Asignará 1400, 1401, 1402... correlativamente)"
              value={batchInitialFolio}
              onChange={(e) => setBatchInitialFolio(e.target.value)}
              className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
            />
          </div>

          <div>
            <label htmlFor="invoices-nota-general-del-lote" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
              Nota General del Lote
            </label>
            <input id="invoices-nota-general-del-lote"
              type="text"
              value={batchManualNotes}
              onChange={(e) => setBatchManualNotes(e.target.value)}
              className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setBatchManualModalOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleConfirmBatchManual} disabled={actionLoading} isLoading={actionLoading}>
            Confirmar Marcado de {selectedAppointmentIds.length} Boletas
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL: EMISIÓN MASIVA AL SII */}
      <Modal show={batchEmitModalOpen} onHide={() => setBatchEmitModalOpen(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="flex items-center gap-2">
            <FiSend className="text-bunny-primary" />
            Emitir {selectedAppointmentIds.length} Boletas en el SII
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs">
            <strong>Atención:</strong> Esta acción enviará secuencialmente cada una de las{' '}
            <strong>{selectedAppointmentIds.length} citas seleccionadas</strong> al servicio de emisión de BHE del SII.
          </div>

          <div className="p-4 bg-bunny-paper rounded-xl border border-bunny-border space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-bunny-text-muted">Total Citas a Emitir:</span>
              <span className="font-bold text-bunny-text">{selectedAppointmentIds.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bunny-text-muted">Citas con RUT Válido:</span>
              <span className="font-bold text-emerald-700">
                {selectedValidRutsCount} de {selectedAppointmentIds.length}
              </span>
            </div>
            <div className="flex justify-between border-t border-bunny-border pt-2 mt-2">
              <span className="font-bold text-bunny-text">Monto Total a Facturar:</span>
              <span className="font-bold text-bunny-primary text-base">{formatCurrencyCLP(selectedTotalAmount)}</span>
            </div>
          </div>

          {selectedValidRutsCount < selectedAppointmentIds.length && (
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
              <strong>Advertencia:</strong> Hay {selectedAppointmentIds.length - selectedValidRutsCount} citas sin RUT
              válido. Esas citas no podrán emitirse en el SII y reportarán error. Te recomendamos editarlas individualmente o deseleccionarlas antes de emitir en lote.
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setBatchEmitModalOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmBatchEmit}
            disabled={actionLoading || selectedAppointmentIds.length === 0}
            isLoading={actionLoading}
          >
            Comenzar Emisión en SII ({selectedAppointmentIds.length})
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL: REENVIAR CORREO SII */}
      <Modal show={resendModalOpen} onHide={() => setResendModalOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="flex items-center gap-2">
            <FiMail className="text-bunny-primary" />
            Reenviar Correo Oficial SII
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          {selectedIssued && (
            <div className="space-y-3">
              <p className="text-xs text-bunny-text-muted">
                Se solicitará al servidor del SII que despache nuevamente el correo electrónico oficial con el PDF y
                XML adjuntos para la boleta <strong>Folio #{selectedIssued.invoiceNumber}</strong>.
              </p>
              <div>
                <label htmlFor="invoices-destinatario" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                  Destinatario:
                </label>
                <input id="invoices-destinatario"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={resendEmailTarget}
                  onChange={(e) => setResendEmailTarget(e.target.value)}
                  className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                />
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setResendModalOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmResend} disabled={actionLoading} isLoading={actionLoading}>
            Reenviar Correo
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL: ANULAR BOLETA EN EL SII */}
      <Modal show={cancelModalOpen} onHide={() => setCancelModalOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="flex items-center gap-2 text-rose-600">
            <FiAlertTriangle />
            Anular Boleta de Honorarios en el SII
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs">
            <strong>Atención:</strong> Esta acción anulará definitivamente la boleta <strong>Folio #{cancelFolio}</strong> directamente en la plataforma del SII.
          </div>
          <div>
            <label htmlFor="invoices-causa-de-anulacion" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
              Causa de Anulación:
            </label>
            <select id="invoices-causa-de-anulacion"
              value={cancelCause}
              onChange={(e) => setCancelCause(e.target.value)}
              className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2.5 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
            >
              {SII_CANCEL_CAUSES.map((cause) => (
                <option key={cause.value} value={cause.value}>
                  {cause.label}
                </option>
              ))}
            </select>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setCancelModalOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmCancel} disabled={actionLoading} isLoading={actionLoading}>
            Confirmar Anulación en SII
          </Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  );
}
