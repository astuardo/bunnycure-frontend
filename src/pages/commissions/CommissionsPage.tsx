import { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  TrendingUp, 
  Eye, 
  Search, 
  FileSpreadsheet
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear, 
  endOfYear,
  parseISO 
} from 'date-fns';
import DashboardLayout from '../../components/common/DashboardLayout';
import { RANGE_PAGE_SIZE, useAppointmentsStore } from '../../stores/appointmentsStore';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../hooks/useToast';
import { Appointment, AppointmentStatus } from '../../types/appointment.types';
import { getAppointmentTotal } from '../../utils/appointmentUtils';
import { Modal, Button, Badge, Spinner } from '../../components/ui';

const formatCurrency = (val: number) => `$${Math.round(val).toLocaleString('es-CL')}`;

type PeriodPreset = 'thisMonth' | 'lastMonth' | 'last30' | 'thisYear' | 'custom';

interface SpecialistCommission {
  name: string;
  totalAppointments: number;
  completedAppointments: number;
  grossRevenue: number;
  commissionPercentage: number;
  grossCommission: number;
  withholdingTax: number; // Retención legal BHE (14.5% en Chile) si aplica
  netToPay: number;
  status: 'PENDING' | 'PAID';
  paidAt?: string;
  notes?: string;
  appointments: Appointment[];
}

const STORAGE_KEY_COMMISSION_RATES = 'bunnycure_specialist_commission_rates_v1';
const STORAGE_KEY_COMMISSION_STATUS = 'bunnycure_specialist_commission_status_v1';

export default function CommissionsPage() {
  const { tenant } = useTenant();
  const toast = useToast();
  const { appointments, isLoading: loadingAppointments, fetchAppointments } = useAppointmentsStore();

  const [activePreset, setActivePreset] = useState<PeriodPreset>('thisMonth');
  const [startDate, setStartDate] = useState<string>(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [applyTaxWithholding, setApplyTaxWithholding] = useState<boolean>(false);
  const [defaultRate, setDefaultRate] = useState<number>(50);

  // Modal de desglose de citas por especialista
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialistCommission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  // Modal para liquidación impresa / recibo
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [receiptSpecialist, setReceiptSpecialist] = useState<SpecialistCommission | null>(null);

  // Tasas de comisión personalizadas por especialista
  const [customRates, setCustomRates] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COMMISSION_RATES);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Estados de pago por período y especialista
  const [paymentStatusMap, setPaymentStatusMap] = useState<Record<string, { status: 'PENDING' | 'PAID'; paidAt?: string }>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COMMISSION_STATUS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Liquidación del período elegido: todas sus citas (la API pagina y devolvía solo las 50 más recientes)
  useEffect(() => {
    if (startDate && endDate) fetchAppointments({ startDate, endDate, size: RANGE_PAGE_SIZE }).catch(() => {});
  }, [fetchAppointments, startDate, endDate]);

  // Manejador de presets de tiempo
  const handlePresetChange = (preset: PeriodPreset) => {
    setActivePreset(preset);
    const now = new Date();
    if (preset === 'thisMonth') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (preset === 'lastMonth') {
      const prev = subMonths(now, 1);
      setStartDate(format(startOfMonth(prev), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(prev), 'yyyy-MM-dd'));
    } else if (preset === 'last30') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(format(d, 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (preset === 'thisYear') {
      setStartDate(format(startOfYear(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfYear(now), 'yyyy-MM-dd'));
    }
  };

  // Guardar tasa personalizada
  const handleRateChange = (specialistName: string, rate: number) => {
    const validRate = Math.min(100, Math.max(0, rate));
    const next = { ...customRates, [specialistName]: validRate };
    setCustomRates(next);
    localStorage.setItem(STORAGE_KEY_COMMISSION_RATES, JSON.stringify(next));
  };

  // Aplicar tasa masiva a todos
  const handleApplyBulkRate = (bulkRate: number) => {
    setDefaultRate(bulkRate);
    const updated: Record<string, number> = {};
    calculatedCommissions.forEach((c) => {
      updated[c.name] = bulkRate;
    });
    setCustomRates(updated);
    localStorage.setItem(STORAGE_KEY_COMMISSION_RATES, JSON.stringify(updated));
    toast.success(`Tasa de comisión fijada al ${bulkRate}% para todos los especialistas`);
  };

  // Marcar como pagada / pendiente
  const handleTogglePaymentStatus = (specialistName: string) => {
    const periodKey = `${startDate}_${endDate}_${specialistName}`;
    const current = paymentStatusMap[periodKey]?.status || 'PENDING';
    const nextStatus = current === 'PENDING' ? 'PAID' : 'PENDING';
    const nextState = {
      ...paymentStatusMap,
      [periodKey]: {
        status: nextStatus as 'PENDING' | 'PAID',
        paidAt: nextStatus === 'PAID' ? new Date().toISOString() : undefined,
      },
    };
    setPaymentStatusMap(nextState);
    localStorage.setItem(STORAGE_KEY_COMMISSION_STATUS, JSON.stringify(nextState));

    if (nextStatus === 'PAID') {
      toast.success(`Liquidación de ${specialistName} marcada como PAGADA`);
    } else {
      toast.info(`Liquidación de ${specialistName} marcada como PENDIENTE`);
    }
  };

  // Cálculo de comisiones agrupadas por especialista
  const calculatedCommissions = useMemo<SpecialistCommission[]>(() => {
    const map = new Map<string, {
      name: string;
      total: number;
      completed: number;
      revenue: number;
      appointments: Appointment[];
    }>();

    appointments.forEach((apt) => {
      if (!apt.appointmentDate) return;
      const dStr = apt.appointmentDate.split('T')[0];
      if (dStr < startDate || dStr > endDate) return;

      const specName = apt.specialistName?.trim() || 'Especialista General';
      const current = map.get(specName) || {
        name: specName,
        total: 0,
        completed: 0,
        revenue: 0,
        appointments: [],
      };

      current.total++;
      if (apt.status === AppointmentStatus.COMPLETED) {
        current.completed++;
        current.revenue += getAppointmentTotal(apt);
        current.appointments.push(apt);
      }

      map.set(specName, current);
    });

    const result: SpecialistCommission[] = [];
    map.forEach((item, name) => {
      const percentage = customRates[name] ?? defaultRate;
      const grossCommission = (item.revenue * percentage) / 100;
      // Retención boleta de honorarios en Chile (14.5% en 2026)
      const withholdingTax = applyTaxWithholding ? grossCommission * 0.145 : 0;
      const netToPay = grossCommission - withholdingTax;

      const periodKey = `${startDate}_${endDate}_${name}`;
      const statusInfo = paymentStatusMap[periodKey] || { status: 'PENDING' };

      result.push({
        name,
        totalAppointments: item.total,
        completedAppointments: item.completed,
        grossRevenue: item.revenue,
        commissionPercentage: percentage,
        grossCommission,
        withholdingTax,
        netToPay,
        status: statusInfo.status,
        paidAt: statusInfo.paidAt,
        appointments: item.appointments.sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate)),
      });
    });

    return result.sort((a, b) => b.grossRevenue - a.grossRevenue);
  }, [
    appointments, 
    startDate, 
    endDate, 
    customRates, 
    defaultRate, 
    applyTaxWithholding, 
    paymentStatusMap
  ]);

  // Filtradas por búsqueda
  const filteredCommissions = useMemo(() => {
    if (!searchQuery.trim()) return calculatedCommissions;
    const q = searchQuery.toLowerCase();
    return calculatedCommissions.filter((c) => c.name.toLowerCase().includes(q));
  }, [calculatedCommissions, searchQuery]);

  // Totales Globales
  const globalTotals = useMemo(() => {
    let totalRevenue = 0;
    let totalCommissions = 0;
    let totalCompleted = 0;

    calculatedCommissions.forEach((c) => {
      totalRevenue += c.grossRevenue;
      totalCommissions += c.netToPay;
      totalCompleted += c.completedAppointments;
    });

    const salonNetMargin = totalRevenue - totalCommissions;
    const avgMarginPercentage = totalRevenue > 0 ? (salonNetMargin / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCommissions,
      salonNetMargin,
      avgMarginPercentage,
      totalCompleted,
    };
  }, [calculatedCommissions]);

  // Compartir por WhatsApp
  const handleShareWhatsApp = (spec: SpecialistCommission) => {
    const periodLabel = `${format(parseISO(startDate), 'dd/MM/yyyy')} al ${format(parseISO(endDate), 'dd/MM/yyyy')}`;
    const text = encodeURIComponent(
      `Hola ${spec.name}! 💅 Te comparto el detalle de tu liquidación de comisiones en ${tenant.name || 'nuestro salón'}:\n\n` +
      `📅 Período: ${periodLabel}\n` +
      `✨ Servicios Realizados: ${spec.completedAppointments}\n` +
      `💵 Producción Total: ${formatCurrency(spec.grossRevenue)}\n` +
      `🎯 % Comisión Pactado: ${spec.commissionPercentage}%\n` +
      `${applyTaxWithholding ? `🏛️ Retención BHE (14.5%): -${formatCurrency(spec.withholdingTax)}\n` : ''}` +
      `💰 Total Neto a Pagar: ${formatCurrency(spec.netToPay)}\n` +
      `📌 Estado: ${spec.status === 'PAID' ? 'PAGADA' : 'PENDIENTE DE PAGO'}\n\n` +
      `¡Muchísimas gracias por tu dedicación y excelente trabajo!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Exportar a CSV / Excel
  const handleExportCSV = () => {
    if (calculatedCommissions.length === 0) {
      toast.warning('No hay datos para exportar en este período');
      return;
    }

    const headers = ['Especialista', 'Servicios Realizados', 'Total Producido CLP', '% Comisión', 'Comisión Bruta CLP', 'Retención BHE CLP', 'Neto a Pagar CLP', 'Estado', 'Fecha Pago'];
    const rows = calculatedCommissions.map((c) => [
      `"${c.name}"`,
      c.completedAppointments,
      c.grossRevenue,
      `${c.commissionPercentage}%`,
      c.grossCommission,
      c.withholdingTax,
      c.netToPay,
      c.status === 'PAID' ? 'PAGADA' : 'PENDIENTE',
      c.paidAt ? format(parseISO(c.paidAt), 'yyyy-MM-dd HH:mm') : 'N/A',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `liquidaciones_comisiones_${startDate}_al_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Archivo CSV descargado con éxito');
  };

  const handlePrintReceipt = (spec: SpecialistCommission) => {
    setReceiptSpecialist(spec);
    setShowReceiptModal(true);
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* ─── Encabezado de la Página ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0E0D8] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C9897A] to-[#B77768] text-white flex items-center justify-center text-2xl shadow-bunny">
              💰
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#5C3D2E] tracking-tight">
                Liquidación de Comisiones
              </h1>
              <p className="text-xs sm:text-sm text-[#9E7B6E]">
                Cálculo automático de porcentajes de honorarios por especialista y rentabilidad del salón.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs font-bold border-[#E8CFC4] text-[#5C3D2E] hover:bg-[#FDF0EC]"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#4B856E]" />
              <span>Exportar Excel/CSV</span>
            </Button>
            <div className="inline-flex bg-[#FDF0EC] p-1 rounded-xl border border-[#F0E0D8]">
              <button
                type="button"
                onClick={() => handleApplyBulkRate(40)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg hover:bg-white text-[#7C3A2D] transition-colors"
                title="Fijar 40% a todo el equipo"
              >
                Fijar 40%
              </button>
              <button
                type="button"
                onClick={() => handleApplyBulkRate(50)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg hover:bg-white text-[#7C3A2D] transition-colors"
                title="Fijar 50% a todo el equipo"
              >
                Fijar 50%
              </button>
              <button
                type="button"
                onClick={() => handleApplyBulkRate(60)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg hover:bg-white text-[#7C3A2D] transition-colors"
                title="Fijar 60% a todo el equipo"
              >
                Fijar 60%
              </button>
            </div>
          </div>
        </div>

        {/* ─── Filtros de Rango de Fecha y Presets ─── */}
        <div className="bg-white p-4 rounded-2xl border border-[#F0E0D8] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => handlePresetChange('thisMonth')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activePreset === 'thisMonth'
                  ? 'bg-[#C9897A] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-[#7A5B50] hover:bg-[#FDF0EC]'
              }`}
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('lastMonth')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activePreset === 'lastMonth'
                  ? 'bg-[#C9897A] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-[#7A5B50] hover:bg-[#FDF0EC]'
              }`}
            >
              Mes Pasado
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('last30')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activePreset === 'last30'
                  ? 'bg-[#C9897A] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-[#7A5B50] hover:bg-[#FDF0EC]'
              }`}
            >
              Últimos 30 Días
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('thisYear')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activePreset === 'thisYear'
                  ? 'bg-[#C9897A] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-[#7A5B50] hover:bg-[#FDF0EC]'
              }`}
            >
              Este Año
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <div className="flex items-center gap-1.5 bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#E8CFC4] text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#C9897A]" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="bg-transparent border-0 focus:outline-none text-xs text-[#5C3D2E] font-medium"
              />
              <span className="text-[#9E7B6E]">a</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="bg-transparent border-0 focus:outline-none text-xs text-[#5C3D2E] font-medium"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#E8CFC4] text-xs">
              <input
                type="checkbox"
                checked={applyTaxWithholding}
                onChange={(e) => setApplyTaxWithholding(e.target.checked)}
                className="w-4 h-4 rounded text-[#C9897A] focus:ring-[#C9897A]"
              />
              <span className="text-[#5C3D2E] font-bold">Retención BHE (14.5%)</span>
            </label>
          </div>
        </div>

        {/* ─── 4 Tarjetas de Métricas Globales ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#F0E0D8] shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-[#9E7B6E] mb-2 uppercase tracking-wider">
              <span>Producción de Servicios</span>
              <DollarSign className="w-4 h-4 text-[#4B856E]" />
            </div>
            <div className="text-2xl font-black text-[#5C3D2E]">
              {formatCurrency(globalTotals.totalRevenue)}
            </div>
            <div className="text-xs text-[#9E7B6E] mt-1">
              En {globalTotals.totalCompleted} citas completadas
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#F0E0D8] shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-[#9E7B6E] mb-2 uppercase tracking-wider">
              <span>Total Comisiones a Pagar</span>
              <Users className="w-4 h-4 text-[#C9897A]" />
            </div>
            <div className="text-2xl font-black text-[#7C3A2D]">
              {formatCurrency(globalTotals.totalCommissions)}
            </div>
            <div className="text-xs text-[#9E7B6E] mt-1">
              Honorarios netos para especialistas
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#F0E0D8] shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-[#9E7B6E] mb-2 uppercase tracking-wider">
              <span>Margen Neto del Salón</span>
              <TrendingUp className="w-4 h-4 text-[#4B856E]" />
            </div>
            <div className="text-2xl font-black text-[#4B856E]">
              {formatCurrency(globalTotals.salonNetMargin)}
            </div>
            <div className="text-xs text-[#4B856E] font-bold mt-1">
              {globalTotals.avgMarginPercentage.toFixed(1)}% margen promedio
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#F0E0D8] shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-[#9E7B6E] mb-2 uppercase tracking-wider">
              <span>Especialistas Activas</span>
              <Sparkles className="w-4 h-4 text-[#E6993A]" />
            </div>
            <div className="text-2xl font-black text-[#5C3D2E]">
              {calculatedCommissions.length}
            </div>
            <div className="text-xs text-[#9E7B6E] mt-1">
              Con atenciones en este período
            </div>
          </div>
        </div>

        {/* ─── Tabla Principal de Liquidaciones ─── */}
        <div className="bg-white rounded-2xl border border-[#F0E0D8] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#F0E0D8] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-[#5C3D2E]">
                Detalle por Especialista
              </span>
              <Badge variant="primary" className="text-xs font-bold">
                {filteredCommissions.length} colaboradoras
              </Badge>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#9E7B6E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E8CFC4] bg-[#FAF8F5] text-xs focus:outline-none focus:ring-1 focus:ring-[#C9897A]"
              />
            </div>
          </div>

          {loadingAppointments ? (
            <div className="p-12 flex justify-center items-center">
              <Spinner />
            </div>
          ) : filteredCommissions.length === 0 ? (
            <div className="p-12 text-center text-[#9E7B6E] space-y-2">
              <div className="text-3xl">💅</div>
              <div className="font-bold text-sm text-[#5C3D2E]">No se encontraron atenciones</div>
              <div className="text-xs">No hay citas completadas en el rango de fechas seleccionado.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#5C3D2E]">
                <thead className="bg-[#FAF8F5] text-[11px] font-bold text-[#7A5B50] uppercase tracking-wider border-b border-[#F0E0D8]">
                  <tr>
                    <th className="py-3 px-4">Especialista</th>
                    <th className="py-3 px-3 text-center">Citas</th>
                    <th className="py-3 px-3 text-right">Producción ($)</th>
                    <th className="py-3 px-3 text-center">% Comisión</th>
                    <th className="py-3 px-3 text-right">Comisión Bruta</th>
                    {applyTaxWithholding && <th className="py-3 px-3 text-right">Retención BHE</th>}
                    <th className="py-3 px-4 text-right">Neto a Pagar</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E0D8]/60">
                  {filteredCommissions.map((spec) => (
                    <tr key={spec.name} className="hover:bg-[#FDF0EC]/40 transition-colors">
                      {/* Especialista */}
                      <td className="py-3.5 px-4 font-bold">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#FDF0EC] text-[#7C3A2D] font-bold text-xs flex items-center justify-center border border-[#E8CFC4] shrink-0">
                            {spec.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#5C3D2E]">{spec.name}</div>
                            <div className="text-[10px] text-[#9E7B6E]">
                              {spec.status === 'PAID' ? 'Liquidación saldada' : 'Pendiente de cobro'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Citas */}
                      <td className="py-3.5 px-3 text-center font-bold text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#F0E0D8]">
                          {spec.completedAppointments}
                        </span>
                      </td>

                      {/* Producción */}
                      <td className="py-3.5 px-3 text-right font-extrabold text-[#5C3D2E]">
                        {formatCurrency(spec.grossRevenue)}
                      </td>

                      {/* % Comisión editable */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-white border border-[#E8CFC4] rounded-lg px-2 py-1 shadow-xs">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={spec.commissionPercentage}
                            onChange={(e) => handleRateChange(spec.name, Number(e.target.value))}
                            className="w-10 text-center font-bold text-xs text-[#7C3A2D] focus:outline-none"
                          />
                          <span className="text-[#9E7B6E] font-bold text-[11px]">%</span>
                        </div>
                      </td>

                      {/* Comisión Bruta */}
                      <td className="py-3.5 px-3 text-right font-semibold text-[#7A5B50]">
                        {formatCurrency(spec.grossCommission)}
                      </td>

                      {/* Retención BHE */}
                      {applyTaxWithholding && (
                        <td className="py-3.5 px-3 text-right text-rose-700 font-medium">
                          -{formatCurrency(spec.withholdingTax)}
                        </td>
                      )}

                      {/* Neto a Pagar */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-sm text-[#7C3A2D]">
                          {formatCurrency(spec.netToPay)}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePaymentStatus(spec.name)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all shadow-xs ${
                            spec.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                          }`}
                        >
                          {spec.status === 'PAID' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Pagada</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pendiente</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Ver Citas */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSpecialist(spec);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 rounded-lg text-[#5C3D2E] hover:bg-[#FDF0EC] border border-[#E8CFC4] transition-colors"
                            title="Ver desglose de citas"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#C9897A]" />
                          </button>

                          {/* Recibo / Imprimir */}
                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(spec)}
                            className="p-1.5 rounded-lg text-[#5C3D2E] hover:bg-[#FDF0EC] border border-[#E8CFC4] transition-colors"
                            title="Generar Recibo de Liquidación"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#7A5B50]" />
                          </button>

                          {/* WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(spec)}
                            className="p-1.5 rounded-lg text-white bg-[#25D366] hover:bg-[#20bd5a] transition-colors"
                            title="Enviar resumen por WhatsApp"
                          >
                            <FaWhatsapp className="w-3.5 h-3.5" />
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

        {/* ─── MODAL 1: DESGLOSE DE CITAS POR ESPECIALISTA ─── */}
        {showDetailModal && selectedSpecialist && (
          <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>
                <div className="flex items-center gap-2 text-base font-bold text-[#5C3D2E]">
                  <span>💅 Desglose de Citas:</span>
                  <span className="text-[#C9897A]">{selectedSpecialist.name}</span>
                </div>
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF8F5] p-3 rounded-xl border border-[#F0E0D8] text-xs">
                <div>
                  <div className="text-[#9E7B6E]">Citas Atendidas:</div>
                  <div className="font-extrabold text-sm text-[#5C3D2E]">{selectedSpecialist.completedAppointments}</div>
                </div>
                <div>
                  <div className="text-[#9E7B6E]">Total Facturado:</div>
                  <div className="font-extrabold text-sm text-[#5C3D2E]">{formatCurrency(selectedSpecialist.grossRevenue)}</div>
                </div>
                <div>
                  <div className="text-[#9E7B6E]">% Comisión:</div>
                  <div className="font-extrabold text-sm text-[#C9897A]">{selectedSpecialist.commissionPercentage}%</div>
                </div>
                <div>
                  <div className="text-[#9E7B6E]">Total a Pagar:</div>
                  <div className="font-extrabold text-sm text-[#4B856E]">{formatCurrency(selectedSpecialist.netToPay)}</div>
                </div>
              </div>

              <div className="overflow-x-auto border border-[#F0E0D8] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] text-[10.5px] uppercase font-bold text-[#7A5B50] border-b border-[#F0E0D8]">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Clienta</th>
                      <th className="py-2.5 px-3">Servicio</th>
                      <th className="py-2.5 px-3 text-right">Precio Cita</th>
                      <th className="py-2.5 px-3 text-right">Comisión ({selectedSpecialist.commissionPercentage}%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E0D8]/60">
                    {selectedSpecialist.appointments.map((apt) => {
                      const total = getAppointmentTotal(apt);
                      const indivCommission = (total * selectedSpecialist.commissionPercentage) / 100;
                      return (
                        <tr key={apt.id} className="hover:bg-[#FAF8F5]">
                          <td className="py-2 px-3 text-[#7A5B50]">
                            {apt.appointmentDate?.split('T')[0]} {apt.appointmentTime?.slice(0, 5)}
                          </td>
                          <td className="py-2 px-3 font-bold text-[#5C3D2E]">
                            {apt.customer?.fullName || 'Clienta'}
                          </td>
                          <td className="py-2 px-3 text-[#7A5B50]">
                            {apt.services?.map((s) => s.name).join(', ') || apt.service?.name || 'Servicio'}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">
                            {formatCurrency(total)}
                          </td>
                          <td className="py-2 px-3 text-right font-extrabold text-[#7C3A2D]">
                            {formatCurrency(indivCommission)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <div className="flex justify-between items-center w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShareWhatsApp(selectedSpecialist)}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  <FaWhatsapp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Enviar por WhatsApp</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowDetailModal(false)}>
                  Cerrar
                </Button>
              </div>
            </Modal.Footer>
          </Modal>
        )}

        {/* ─── MODAL 2: RECIBO IMPRESO DE LIQUIDACIÓN FORMAL ─── */}
        {showReceiptModal && receiptSpecialist && (
          <Modal show={showReceiptModal} onHide={() => setShowReceiptModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Recibo Oficial de Liquidación de Honorarios</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-6">
              <div id="printable-commission-receipt" className="p-6 bg-white border border-[#E8CFC4] rounded-2xl space-y-6 text-[#5C3D2E]">
                {/* Membrete */}
                <div className="flex justify-between items-start border-b border-[#F0E0D8] pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#5C3D2E]">💅 {tenant.name || 'BunnyCure'}</h2>
                    <div className="text-xs text-[#9E7B6E]">{tenant.slogan || 'Salón de Belleza & Estética'}</div>
                    <div className="text-xs text-[#9E7B6E]">{tenant.address || 'Santiago, Chile'}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#FDF0EC] text-[#7C3A2D] border border-[#E8CFC4]">
                      Liquidación de Honorarios
                    </span>
                    <div className="text-xs text-[#9E7B6E] mt-2">
                      Fecha: {format(new Date(), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </div>
                </div>

                {/* Datos del colaborador y período */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-[#FAF8F5] p-4 rounded-xl border border-[#F0E0D8]">
                  <div>
                    <div><strong>Profesional:</strong> {receiptSpecialist.name}</div>
                    <div><strong>Función:</strong> Manicurista / Especialista</div>
                  </div>
                  <div>
                    <div><strong>Período Liquidado:</strong> {format(parseISO(startDate), 'dd/MM/yyyy')} al {format(parseISO(endDate), 'dd/MM/yyyy')}</div>
                    <div><strong>Estado:</strong> {receiptSpecialist.status === 'PAID' ? 'PAGADA / TRANSFERIDA' : 'PENDIENTE'}</div>
                  </div>
                </div>

                {/* Desglose Económico */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#F0E0D8]">
                    <span>Citas y Procedimientos Atendidos:</span>
                    <strong>{receiptSpecialist.completedAppointments} servicios</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#F0E0D8]">
                    <span>Total Producido / Facturado:</span>
                    <strong>{formatCurrency(receiptSpecialist.grossRevenue)}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#F0E0D8]">
                    <span>Porcentaje de Comisión Pactado:</span>
                    <strong className="text-[#C9897A]">{receiptSpecialist.commissionPercentage}%</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#F0E0D8]">
                    <span>Comisión Bruta:</span>
                    <strong>{formatCurrency(receiptSpecialist.grossCommission)}</strong>
                  </div>
                  {applyTaxWithholding && (
                    <div className="flex justify-between py-1.5 border-b border-[#F0E0D8] text-rose-700">
                      <span>Retención Legal Boleta de Honorarios (14.5%):</span>
                      <strong>-{formatCurrency(receiptSpecialist.withholdingTax)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between py-2 text-base font-extrabold text-[#7C3A2D] bg-[#FDF0EC] px-3 rounded-lg">
                    <span>Líquido a Percibir:</span>
                    <span>{formatCurrency(receiptSpecialist.netToPay)}</span>
                  </div>
                </div>

                {/* Firmas */}
                <div className="grid grid-cols-2 gap-8 pt-10 text-center text-xs">
                  <div>
                    <div className="border-t border-[#A6887D] w-3/4 mx-auto pt-2 font-bold">
                      Firma Administración
                    </div>
                    <div className="text-[10px] text-[#9E7B6E]">{tenant.name || 'BunnyCure'}</div>
                  </div>
                  <div>
                    <div className="border-t border-[#A6887D] w-3/4 mx-auto pt-2 font-bold">
                      Firma Profesional
                    </div>
                    <div className="text-[10px] text-[#9E7B6E]">{receiptSpecialist.name} (Recepción conforme)</div>
                  </div>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <div className="flex justify-between w-full">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={triggerBrowserPrint}
                  className="flex items-center gap-1.5 text-xs font-bold"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar PDF</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowReceiptModal(false)}>
                  Cerrar
                </Button>
              </div>
            </Modal.Footer>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
