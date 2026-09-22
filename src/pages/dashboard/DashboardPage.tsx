import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isToday, startOfWeek, endOfWeek, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    CalendarDays,
    CalendarOff,
    UserPlus,
    Scissors,
    Zap,
    BarChart3,
    TrendingUp,
    Users,
    DollarSign,
    Check,
    CheckCheck,
    RefreshCw,
    AlertTriangle,
    Trash2,
    Inbox,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { whatsappMessagesApi, IncomingWhatsAppMessageDto } from '@/api/whatsappMessages.api';
import { whatsappOutboxApi, WhatsAppOutboxMessageDto } from '@/api/whatsappOutbox.api';
import DashboardLayout from '@/components/common/DashboardLayout';
import { CancelAppointmentDialog, CancelledByOption } from '@/components/appointments/CancelAppointmentDialog';
import { CompleteAppointmentWithSuppliesModal } from '@/components/appointments/CompleteAppointmentWithSuppliesModal';
import { CashClosingModal } from '@/components/finances/CashClosingModal';
import { useAppointmentsStore } from '@/stores/appointmentsStore';
import { useCustomersStore } from '@/stores/customersStore';
import { Appointment, AppointmentStatus } from '@/types/appointment.types';
import { ServiceSummary } from '@/types/service.types';
import { statsApi } from '../../api/stats.api';
import { DashboardStats, TodayOperationalStats } from '@/types/stats.types';
import { 
    settingsApi, 
    loadCachedUnavailabilities, 
    loadCachedUnavailabilityColors 
} from '@/api/settings.api';
import {
    ScheduleUnavailability,
    UnavailabilityColorConfig,
} from '@/types/unavailability.types';
import {
    isDateBlockedFullDay,
    getDateUnavailabilities,
    getTodayUnavailabilities,
} from '@/utils/unavailabilityUtils';
import { useCalendarDisplayConfig } from '@/hooks/useCalendarDisplayConfig';
import { getDayDotColors } from '@/utils/calendarDisplay';
import { useToast } from '@/hooks/useToast';
import { trackAppointmentCancelled } from '@/utils/analytics';
import { getAppointmentTotal } from '@/utils/appointmentUtils';
import { formatRutWithDots } from '@/utils/rutUtils';

// ─── helpers ────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) => `$${value.toLocaleString('es-CL')}`;

function getAppointmentServices(apt: Appointment): ServiceSummary[] {
    if (apt.services && apt.services.length > 0) return apt.services;
    return apt.service ? [apt.service] : [];
}

function statusLabel(status: AppointmentStatus): string {
    const map: Record<AppointmentStatus, string> = {
        PENDING:   'Pendiente',
        CONFIRMED: 'Confirmada',
        COMPLETED: 'Completada',
        CANCELLED: 'Cancelada',
        RESCHEDULE_REQUESTED: 'Reprogramar',
    };
    return map[status] ?? status;
}

function statusPillStyle(status: AppointmentStatus): React.CSSProperties {
    switch (status) {
        case AppointmentStatus.PENDING:
            return { background: '#fde8cc', color: '#7c4a00' };
        case AppointmentStatus.CONFIRMED:
            return { background: '#d4edda', color: '#155724' };
        case AppointmentStatus.COMPLETED:
            return { background: '#c8e6e0', color: '#0d5c4a' };
        case AppointmentStatus.CANCELLED:
            return { background: '#fce4e4', color: '#7c1c1c' };
        case AppointmentStatus.RESCHEDULE_REQUESTED:
            return { background: '#ffe8cc', color: '#d9480f' };
        default:
            return { background: '#e9ecef', color: '#495057' };
    }
}

function getWhatsAppUrlForReschedule(apt: Appointment): string {
    const rawPhone = apt.customer?.phone?.replace(/\D/g, '') || '';
    if (!rawPhone) return '#';
    const phone = rawPhone.startsWith('56') ? rawPhone : (rawPhone.length === 9 ? `56${rawPhone}` : `56${rawPhone}`);
    const dateFormatted = apt.appointmentDate
        ? format(parseISO(apt.appointmentDate.split('T')[0]), 'dd/MM/yyyy', { locale: es })
        : '';
    const timeFormatted = apt.appointmentTime ? apt.appointmentTime.slice(0, 5) : '';
    const dateText = dateFormatted ? ` del ${dateFormatted}${timeFormatted ? ` a las ${timeFormatted} hrs` : ''}` : '';
    const message = `Hola ${apt.customer?.fullName || 'Clienta'}! Te escribimos de BunnyCure respecto a tu solicitud para reprogramar tu cita${dateText}. ¿Qué día y horario te acomodaría?`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function formatMessageTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
        const d = parseISO(dateStr);
        if (isToday(d)) {
            return `Hoy a las ${format(d, 'HH:mm')}`;
        }
        return format(d, 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
        return dateStr;
    }
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ flex: 1, height: '1px', background: '#d4a89a' }} />
            <span style={{ color: '#8b6f5e', fontSize: '15px', fontWeight: 500, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                {children}
            </span>
            <span style={{ flex: 1, height: '1px', background: '#d4a89a' }} />
        </div>
    );
}

function DashCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.88)',
            borderRadius: '20px',
            border: '1px solid rgba(240,224,216,0.7)',
            boxShadow: '0 2px 12px rgba(180,120,100,0.08)',
            overflow: 'hidden',
            ...style,
        }}>
            {children}
        </div>
    );
}

// Botón de acción — texto siempre dentro, ícono arriba en móvil si es necesario
type ActionVariant = 'rose' | 'mint' | 'beige' | 'sky';
const variantStyles: Record<ActionVariant, { bg: string; hover: string; text: string; icon: string }> = {
    rose:  { bg: '#fce8e4', hover: '#f9d5cf', text: '#7c3a2d', icon: '#c9897a' },
    mint:  { bg: '#e8f5f0', hover: '#d4ede6', text: '#2d6b55', icon: '#5a9e82' },
    beige: { bg: '#f5ede8', hover: '#eeddd6', text: '#6b4c38', icon: '#b07a5e' },
    sky:   { bg: '#e8f0f8', hover: '#d4e4f2', text: '#2d4f7c', icon: '#5a7eb0' },
};

function ActionButton({ icon, label, to, onClick, variant }: {
    icon: React.ReactNode; label: string; to?: string; onClick?: () => void; variant: ActionVariant;
}) {
    const navigate = useNavigate();
    const st = variantStyles[variant];
    const [hover, setHover] = useState(false);

    const inner = (
        <button
            onClick={onClick ? onClick : to ? () => navigate(to) : undefined}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: '100%',
                background: hover ? st.hover : st.bg,
                border: 'none',
                borderRadius: '14px',
                padding: '12px 8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: st.text,
                fontWeight: 600,
                fontSize: '12px',
                lineHeight: 1.2,
                textAlign: 'center',
                transition: 'background 0.15s, transform 0.1s',
                transform: hover ? 'translateY(-1px)' : 'none',
                boxShadow: hover ? '0 3px 8px rgba(180,120,100,0.15)' : 'none',
                minHeight: '72px',
            }}
        >
            <span style={{ color: st.icon, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </span>
            <span style={{ wordBreak: 'break-word', maxWidth: '100%' }}>{label}</span>
        </button>
    );

    return inner;
}

function Spinner() {
    return (
        <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            border: '3px solid #f0d0c8', borderTopColor: '#c9897a',
            animation: 'spin 0.8s linear infinite',
        }} />
    );
}

const weekDayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ─── main page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const { appointments, isLoading: appointmentsLoading, fetchAppointments, updateAppointmentStatus, updateAppointment } = useAppointmentsStore();
    const { customers, fetchCustomers } = useCustomersStore();
    const [statsLoading, setStatsLoading] = useState(true);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [todayStats, setTodayStats] = useState<TodayOperationalStats | null>(null);
    const [unavailabilities, setUnavailabilities] = useState<ScheduleUnavailability[]>(loadCachedUnavailabilities);
    const [unavailabilityColors, setUnavailabilityColors] = useState<UnavailabilityColorConfig>(loadCachedUnavailabilityColors);
    const [calendarMonth] = useState(new Date());
    const calendarDisplayConfig = useCalendarDisplayConfig();
    const [completeDialog, setCompleteDialog] = useState<{ show: boolean; appointmentId: number | null }>({ show: false, appointmentId: null });
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showCashClosingModal, setShowCashClosingModal] = useState(false);
    const [cancelingAppointmentId, setCancelingAppointmentId] = useState<number | null>(null);
    const [isCancelLoading, setIsCancelLoading] = useState(false);
    const [whatsappMessages, setWhatsappMessages] = useState<IncomingWhatsAppMessageDto[]>([]);
    const [unreadWaCount, setUnreadWaCount] = useState<number>(0);
    const [waLoading, setWaLoading] = useState<boolean>(false);
    const [waFilterUnreadOnly, setWaFilterUnreadOnly] = useState<boolean>(false);
    const [waActiveTab, setWaActiveTab] = useState<'INBOX' | 'OUTBOX'>('INBOX');
    const [outboxMessages, setOutboxMessages] = useState<WhatsAppOutboxMessageDto[]>([]);
    const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(0);
    const [outboxLoading, setOutboxLoading] = useState<boolean>(false);
    const [retryingId, setRetryingId] = useState<number | null>(null);
    const [retryingAll, setRetryingAll] = useState<boolean>(false);
    const [discardingId, setDiscardingId] = useState<number | null>(null);

    const loadWhatsAppMessages = async (unreadOnly = waFilterUnreadOnly) => {
        setWaLoading(true);
        try {
            const [resp, count] = await Promise.all([
                whatsappMessagesApi.getMessages(0, 10, unreadOnly),
                whatsappMessagesApi.getUnreadCount(),
            ]);
            setWhatsappMessages(resp.content || []);
            setUnreadWaCount(count);
        } catch (error) {
            console.error("Error cargando mensajes de WhatsApp:", error);
        } finally {
            setWaLoading(false);
        }
    };

    const loadOutboxMessages = async () => {
        setOutboxLoading(true);
        try {
            const [resp, count] = await Promise.all([
                whatsappOutboxApi.getMessages(0, 20, true),
                whatsappOutboxApi.getPendingCount(),
            ]);
            setOutboxMessages(resp.content || []);
            setPendingOutboxCount(count);
        } catch (error) {
            console.error("Error cargando mensajes outbox de WhatsApp:", error);
        } finally {
            setOutboxLoading(false);
        }
    };

    const handleRetryOne = async (id: number) => {
        setRetryingId(id);
        try {
            const res = await whatsappOutboxApi.retryMessage(id);
            if (res.success) {
                toast.success(res.message || 'Mensaje reintentado y enviado exitosamente');
                await loadOutboxMessages();
            } else {
                toast.error(res.error || res.message || 'Falló el reintento');
                await loadOutboxMessages();
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Error al reintentar el mensaje');
        } finally {
            setRetryingId(null);
        }
    };

    const handleRetryAll = async () => {
        setRetryingAll(true);
        try {
            const res = await whatsappOutboxApi.retryAll();
            toast.info(`Reintento completado: ${res.succeeded} exitosos, ${res.failed} fallidos de ${res.total}`);
            await loadOutboxMessages();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Error al reintentar mensajes');
        } finally {
            setRetryingAll(false);
        }
    };

    const handleDiscardOne = async (id: number) => {
        setDiscardingId(id);
        try {
            await whatsappOutboxApi.discardMessage(id);
            toast.success('Mensaje descartado de la cola');
            setOutboxMessages((prev) => prev.filter((m) => m.id !== id));
            setPendingOutboxCount((prev) => Math.max(0, prev - 1));
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Error al descartar el mensaje');
        } finally {
            setDiscardingId(null);
        }
    };

    const handleDiscardAll = async () => {
        if (!window.confirm('¿Estás segura/o de descartar todos los mensajes fallidos? Ya no se podrán reintentar.')) {
            return;
        }
        try {
            const count = await whatsappOutboxApi.discardAll();
            toast.success(`${count} mensaje(s) descartado(s) correctamente`);
            setOutboxMessages([]);
            setPendingOutboxCount(0);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Error al descartar los mensajes');
        }
    };

    useEffect(() => {
        const load = async () => {
            setStatsLoading(true);
            try {
                const [stats, operationalToday, settingsData] = await Promise.all([
                    statsApi.getDashboardStats(),
                    statsApi.getTodayOperationalStats().catch(() => null),
                    settingsApi.getAll().catch(() => null),
                    fetchAppointments(), 
                    fetchCustomers(),
                    loadWhatsAppMessages(),
                    loadOutboxMessages()
                ]);
                setDashboardStats(stats);
                if (operationalToday) setTodayStats(operationalToday);
                if (settingsData?.unavailabilities) setUnavailabilities(settingsData.unavailabilities);
                if (settingsData?.unavailabilityColors) setUnavailabilityColors(settingsData.unavailabilityColors);
            } catch (error) {
                console.error("Error loading dashboard stats:", error);
            } finally {
                setStatsLoading(false);
            }
        };
        load();
    }, [fetchAppointments, fetchCustomers]);

    const handleMarkWaAsRead = async (id: number) => {
        try {
            await whatsappMessagesApi.markAsRead(id);
            setWhatsappMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: true } : m)));
            setUnreadWaCount((prev) => Math.max(0, prev - 1));
            toast.success('Mensaje marcado como leído');
        } catch {
            toast.error('No se pudo marcar como leído');
        }
    };

    const handleMarkAllWaAsRead = async () => {
        try {
            await whatsappMessagesApi.markAllAsRead();
            setWhatsappMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
            setUnreadWaCount(0);
            toast.success('Todos los mensajes marcados como leídos');
        } catch {
            toast.error('No se pudieron marcar todos como leídos');
        }
    };

    const handleToggleWaFilter = (unreadOnly: boolean) => {
        setWaFilterUnreadOnly(unreadOnly);
        loadWhatsAppMessages(unreadOnly);
    };

    const handleCancelAppointment = (id: number) => {
        setCancelingAppointmentId(id);
        setShowCancelModal(true);
    };

    const handleConfirmCancelAppointment = async (
        reason: string,
        cancelledBy: CancelledByOption = 'CUSTOMER'
    ) => {
        if (!cancelingAppointmentId) return;

        setIsCancelLoading(true);
        try {
            const appointment = appointments.find((apt) => apt.id === cancelingAppointmentId);
            if (!appointment) throw new Error('Cita no encontrada');

            const initiatorLabel = cancelledBy === 'MANICURIST' ? 'Manicurista' : 'Cliente';
            const cancellationBlock = `--- CANCELACIÓN ---\nCancelado por: ${initiatorLabel}\nMotivo: ${reason}`;

            const updatedNotes = appointment.notes
                ? `${appointment.notes}\n\n${cancellationBlock}`
                : cancellationBlock;

            await updateAppointmentStatus(cancelingAppointmentId, AppointmentStatus.CANCELLED, { notes: updatedNotes });
            await updateAppointment(cancelingAppointmentId, { notes: updatedNotes });

            // 🔍 Track cancellation en GA4
            trackAppointmentCancelled(cancelingAppointmentId, appointment.customer.id, reason, cancelledBy.toLowerCase());

            toast.success(cancelledBy === 'MANICURIST' ? 'Cita cancelada (por manicurista)' : 'Cita cancelada correctamente');
            setShowCancelModal(false);
            setCancelingAppointmentId(null);
            await fetchAppointments();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al cancelar la cita');
        } finally {
            setIsCancelLoading(false);
        }
    };

    const todayAppointments = appointments.filter(
        (apt: Appointment) => apt.appointmentDate && isToday(parseISO(apt.appointmentDate))
    );
    const todayUnavailabilities = useMemo(() => {
        return getTodayUnavailabilities(unavailabilities);
    }, [unavailabilities]);

    const thisWeekAppointments = useMemo(() => {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd   = endOfWeek(new Date(),   { weekStartsOn: 1 });
        return appointments.filter((apt: Appointment) => {
            if (!apt.appointmentDate) return false;
            const dateStr = apt.appointmentDate.split('T')[0];
            const d = parseISO(dateStr);
            return d >= weekStart && d <= weekEnd;
        });
    }, [appointments]);

    const rescheduleRequestedAppointments = useMemo(() => {
        return appointments.filter((apt: Appointment) => apt.status === AppointmentStatus.RESCHEDULE_REQUESTED);
    }, [appointments]);

    const weekStats = useMemo(() => [
        { label: 'Confirmadas', count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.CONFIRMED).length, bg: '#d4edda', color: '#155724' },
        { label: 'Completadas', count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.COMPLETED).length, bg: '#c8e6e0', color: '#0d5c4a' },
        { label: 'Pendientes',  count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.PENDING).length,   bg: '#fde8cc', color: '#7c4a00' },
        { label: 'Reprogramar', count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.RESCHEDULE_REQUESTED).length, bg: '#ffe8cc', color: '#d9480f' },
        { label: 'Canceladas',  count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.CANCELLED).length,  bg: '#fce4e4', color: '#7c1c1c' },
    ], [thisWeekAppointments]);

    const monthCalendarCells = useMemo(() => {
        const monthStart = startOfMonth(calendarMonth);
        const monthEnd = endOfMonth(calendarMonth);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

        return days.map((day) => {
            const dayAppointments = appointments.filter((apt: Appointment) => {
                const aptDate = apt.appointmentDate.includes('T')
                    ? new Date(apt.appointmentDate)
                    : new Date(`${apt.appointmentDate}T00:00:00`);
                return isSameDay(aptDate, day);
            });

            const fullDayBlock = isDateBlockedFullDay(day, unavailabilities);
            const dayBlocks = getDateUnavailabilities(day, unavailabilities);
            const slotBlocks = dayBlocks.filter(b => b.type === 'TIME_SLOT');

            return {
                date: day,
                isToday: isToday(day),
                isOutsideMonth: !isSameMonth(day, calendarMonth),
                appointmentCount: dayAppointments.length,
                dotColors: getDayDotColors(dayAppointments, calendarDisplayConfig),
                isFullDayBlocked: fullDayBlock.blocked,
                blockReason: fullDayBlock.reason,
                isTimeSlotBlocked: slotBlocks.length > 0,
                timeSlotReason: slotBlocks[0]?.reason,
                timeSlotBlocks: slotBlocks,
            };
        });
    }, [appointments, calendarMonth, calendarDisplayConfig, unavailabilities]);

    const PAGE_BG   = '#fdf0ec';
    const CARD_PAD  = '20px';
    const TEXT_DARK = '#5c3d2e';
    const TEXT_MID  = '#9e7b6e';
    const DIVIDER   = '1px solid #f0e0d8';

    return (
        <DashboardLayout>
            {/* inject keyframe for spinner */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            <div style={{ minHeight: '100vh', background: PAGE_BG, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* ══ 1. Clientes Activos ══════════════════════════════════ */}
                <DashCard style={{ padding: CARD_PAD, textAlign: 'center' }}>
                    <SectionTitle>Clientes Activos</SectionTitle>
                    {statsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}><Spinner /></div>
                    ) : (
                        <>
                            <div style={{ fontSize: '72px', fontWeight: 300, color: '#5a8f7b', lineHeight: 1, marginBottom: '6px' }}>
                                {customers.length}
                            </div>
                            <div style={{ fontSize: '14px', color: TEXT_MID }}>Total registrados</div>
                        </>
                    )}
                </DashCard>

                {/* ══ 2. Acciones Rápidas ══════════════════════════════════ */}
                <DashCard style={{ padding: CARD_PAD }}>
                    <SectionTitle>
                        <Zap size={14} style={{ display: 'inline', color: '#e8a838', marginRight: '6px', verticalAlign: 'middle' }} />
                        Acciones Rápidas
                    </SectionTitle>
                    {/* Grid responsivo para acciones rápidas */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                        <ActionButton icon={<CalendarDays size={22} />} label="Nueva Cita"          to="/appointments?create=1&returnTo=%2Fdashboard"    variant="rose" />
                        <ActionButton icon={<UserPlus    size={22} />} label="Nuevo Cliente"        to="/customers?create=1&returnTo=%2Fdashboard"       variant="mint" />
                        <ActionButton icon={<DollarSign  size={22} />} label="Cierre de Caja"       onClick={() => setShowCashClosingModal(true)}         variant="mint" />
                        <ActionButton icon={<CalendarOff size={22} />} label="Bloquear Agenda"      to="/calendar?manageBlocks=1"                        variant="rose" />
                        <ActionButton icon={<CalendarDays size={22} />} label="Calendario"          to="/calendar"                                       variant="beige" />
                        <ActionButton icon={<Scissors   size={22} />} label="Gestionar Servicios"  to="/services"                                       variant="sky"  />
                    </div>
                </DashCard>

                {/* ══ Banner: Citas con Solicitud de Reprogramación ═════════ */}
                {rescheduleRequestedAppointments.length > 0 && (
                    <DashCard style={{ padding: '14px 20px', borderLeft: '5px solid #d9480f', background: '#fffaf5' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '22px' }}>🔄</span>
                                <div>
                                    <strong style={{ color: '#d9480f', fontSize: '14px' }}>
                                        {rescheduleRequestedAppointments.length} cita(s) solicitan reprogramación
                                    </strong>
                                    <div style={{ fontSize: '12px', color: TEXT_MID }}>
                                        Clientas que respondieron para reagendar. Contáctalas por WhatsApp para coordinar su nueva hora.
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {rescheduleRequestedAppointments.slice(0, 3).map((apt) => (
                                    <a
                                        key={apt.id}
                                        href={getWhatsAppUrlForReschedule(apt)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={`Contactar a ${apt.customer.fullName} por WhatsApp`}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            background: '#e8f7ee',
                                            color: '#128C7E',
                                            border: '1px solid #25D366',
                                            borderRadius: '999px',
                                            padding: '4px 12px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            textDecoration: 'none',
                                            boxShadow: '0 1px 3px rgba(37, 211, 102, 0.2)',
                                        }}
                                    >
                                        <FaWhatsapp size={14} style={{ color: '#25D366' }} />
                                        <span>{apt.customer.fullName?.split(' ')[0]}: WhatsApp</span>
                                    </a>
                                ))}
                                <Link
                                    to="/appointments?status=RESCHEDULE_REQUESTED"
                                    style={{
                                        fontSize: '12px',
                                        color: '#d9480f',
                                        fontWeight: 600,
                                        textDecoration: 'underline',
                                        marginLeft: '4px',
                                    }}
                                >
                                    Ver todas ({rescheduleRequestedAppointments.length}) &rarr;
                                </Link>
                            </div>
                        </div>
                    </DashCard>
                )}

                {/* ══ 2. Bandeja de Mensajes WhatsApp + Outbox ══════════════════════════════ */}
                <DashCard style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: '#e8f7ee',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#25D366'
                            }}>
                                <FaWhatsapp size={22} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '15px', color: TEXT_DARK }}>
                                        Gestión de WhatsApp
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: TEXT_MID }}>
                                    Mensajes recibidos de clientas y cola de reintentos de notificaciones automáticas.
                                </div>
                            </div>
                        </div>

                        {/* Pestañas principales: Bandeja Entrada vs No Entregados / Reintentos */}
                        <div style={{ display: 'inline-flex', background: '#f0f2f5', padding: '3px', borderRadius: '10px', gap: '4px' }}>
                            <button
                                type="button"
                                onClick={() => setWaActiveTab('INBOX')}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    border: 'none',
                                    background: waActiveTab === 'INBOX' ? '#fff' : 'transparent',
                                    color: waActiveTab === 'INBOX' ? '#128C7E' : TEXT_MID,
                                    fontWeight: waActiveTab === 'INBOX' ? 700 : 500,
                                    fontSize: '12px',
                                    padding: '5px 12px',
                                    borderRadius: '7px',
                                    cursor: 'pointer',
                                    boxShadow: waActiveTab === 'INBOX' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                }}
                            >
                                <Inbox size={13} />
                                <span>Recibidos</span>
                                {unreadWaCount > 0 && (
                                    <span style={{
                                        background: '#25D366',
                                        color: '#fff',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: '999px',
                                    }}>
                                        {unreadWaCount}
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setWaActiveTab('OUTBOX');
                                    loadOutboxMessages();
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    border: 'none',
                                    background: waActiveTab === 'OUTBOX' ? '#fff' : 'transparent',
                                    color: waActiveTab === 'OUTBOX' ? '#d93829' : TEXT_MID,
                                    fontWeight: waActiveTab === 'OUTBOX' ? 700 : 500,
                                    fontSize: '12px',
                                    padding: '5px 12px',
                                    borderRadius: '7px',
                                    cursor: 'pointer',
                                    boxShadow: waActiveTab === 'OUTBOX' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                }}
                            >
                                <AlertTriangle size={13} style={{ color: pendingOutboxCount > 0 ? '#d93829' : TEXT_MID }} />
                                <span>No Entregados / Reintentos</span>
                                {pendingOutboxCount > 0 && (
                                    <span style={{
                                        background: '#d93829',
                                        color: '#fff',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: '999px',
                                    }}>
                                        {pendingOutboxCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* VISTA 1: BANDEJA DE ENTRADA (Mensajes de clientas) */}
                    {waActiveTab === 'INBOX' && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ display: 'inline-flex', background: '#f8f9fa', padding: '3px', borderRadius: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleWaFilter(false)}
                                        style={{
                                            border: 'none',
                                            background: !waFilterUnreadOnly ? '#fff' : 'transparent',
                                            color: !waFilterUnreadOnly ? TEXT_DARK : TEXT_MID,
                                            fontWeight: !waFilterUnreadOnly ? 700 : 500,
                                            fontSize: '11.5px',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            boxShadow: !waFilterUnreadOnly ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                                        }}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleWaFilter(true)}
                                        style={{
                                            border: 'none',
                                            background: waFilterUnreadOnly ? '#fff' : 'transparent',
                                            color: waFilterUnreadOnly ? '#128C7E' : TEXT_MID,
                                            fontWeight: waFilterUnreadOnly ? 700 : 500,
                                            fontSize: '11.5px',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            boxShadow: waFilterUnreadOnly ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                                        }}
                                    >
                                        Solo no leídos {unreadWaCount > 0 ? `(${unreadWaCount})` : ''}
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    {unreadWaCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleMarkAllWaAsRead}
                                            title="Marcar todos como leídos"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                background: '#f8f9fa',
                                                color: TEXT_MID,
                                                border: `1px solid ${DIVIDER}`,
                                                borderRadius: '8px',
                                                padding: '5px 10px',
                                                fontSize: '11.5px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <CheckCheck size={14} style={{ color: '#128C7E' }} />
                                            <span>Marcar todo leído</span>
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => loadWhatsAppMessages()}
                                        title="Actualizar mensajes"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '30px',
                                            height: '30px',
                                            borderRadius: '8px',
                                            border: `1px solid ${DIVIDER}`,
                                            background: '#fff',
                                            color: TEXT_MID,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <RefreshCw size={14} style={{ animation: waLoading ? 'spin 1s linear infinite' : 'none' }} />
                                    </button>
                                </div>
                            </div>

                            {waLoading && whatsappMessages.length === 0 ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                                    <Spinner />
                                </div>
                            ) : whatsappMessages.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '24px 16px',
                                    background: '#fafafa',
                                    borderRadius: '10px',
                                    border: `1px dashed ${DIVIDER}`,
                                    color: TEXT_MID,
                                    fontSize: '13px',
                                }}>
                                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>💬</div>
                                    {waFilterUnreadOnly ? (
                                        <div>No tienes mensajes sin leer pendientes. ¡Estás al día!</div>
                                    ) : (
                                        <div>Aún no hay mensajes entrantes registrados. Cuando tus clientas te escriban por WhatsApp, aparecerán aquí.</div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {whatsappMessages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            style={{
                                                border: !msg.isRead ? '1px solid #b7ebd1' : `1px solid ${DIVIDER}`,
                                                background: !msg.isRead ? '#f5fbf7' : '#ffffff',
                                                borderRadius: '12px',
                                                padding: '12px 14px',
                                                transition: 'box-shadow 0.15s ease',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: TEXT_DARK }}>
                                                        {msg.senderName || msg.fromPhone}
                                                    </span>
                                                    {msg.customerName && (
                                                        <span style={{
                                                            fontSize: '10.5px',
                                                            fontWeight: 700,
                                                            background: '#e8f7ee',
                                                            color: '#128C7E',
                                                            padding: '1px 6px',
                                                            borderRadius: '4px',
                                                        }}>
                                                            Clienta
                                                        </span>
                                                    )}
                                                    {!msg.isRead && (
                                                        <span style={{
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            background: '#d1f2e1',
                                                            color: '#0d683c',
                                                            padding: '1px 6px',
                                                            borderRadius: '4px',
                                                        }}>
                                                            NUEVO
                                                        </span>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '11px', color: '#888' }}>
                                                    {formatMessageTime(msg.createdAt)}
                                                </span>
                                            </div>

                                            <div style={{
                                                background: !msg.isRead ? '#ffffff' : '#f8f9fa',
                                                border: `1px solid ${!msg.isRead ? '#d1f2e1' : '#eaeaea'}`,
                                                borderRadius: '8px',
                                                padding: '9px 12px',
                                                fontSize: '13px',
                                                color: '#2a2a2a',
                                                lineHeight: 1.4,
                                                wordBreak: 'break-word',
                                                whiteSpace: 'pre-wrap',
                                                marginBottom: '10px',
                                            }}>
                                                «{msg.content}»
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                <span style={{ fontSize: '11.5px', color: TEXT_MID, fontFamily: 'monospace' }}>
                                                    +{msg.fromPhone}
                                                </span>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    {!msg.isRead && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMarkWaAsRead(msg.id)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                background: '#edf2f7',
                                                                color: '#4a5568',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                padding: '4px 9px',
                                                                fontSize: '11.5px',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            <Check size={13} />
                                                            <span>Marcar leído</span>
                                                        </button>
                                                    )}
                                                    <a
                                                        href={msg.replyUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            background: '#25D366',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            padding: '5px 12px',
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            textDecoration: 'none',
                                                            boxShadow: '0 2px 4px rgba(37, 211, 102, 0.25)',
                                                        }}
                                                    >
                                                        <FaWhatsapp size={14} />
                                                        <span>💬 Responder en WhatsApp</span>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* VISTA 2: NO ENTREGADOS / REINTENTOS (Outbox) */}
                    {waActiveTab === 'OUTBOX' && (
                        <div>
                            {/* Barra de acciones superior para Outbox */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ fontSize: '12.5px', color: TEXT_MID }}>
                                    {pendingOutboxCount === 0 ? (
                                        <span>No hay notificaciones pendientes ni errores registrados.</span>
                                    ) : (
                                        <span>Hay <strong>{pendingOutboxCount}</strong> mensaje(s) que no pudieron ser entregados por Meta.</span>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {pendingOutboxCount > 0 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handleRetryAll}
                                                disabled={retryingAll}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    background: '#128C7E',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '5px 12px',
                                                    fontSize: '11.5px',
                                                    fontWeight: 700,
                                                    cursor: retryingAll ? 'not-allowed' : 'pointer',
                                                    boxShadow: '0 1px 3px rgba(18,140,126,0.3)',
                                                }}
                                            >
                                                <RefreshCw size={13} style={{ animation: retryingAll ? 'spin 1s linear infinite' : 'none' }} />
                                                <span>{retryingAll ? 'Reintentando...' : `Reintentar todos (${pendingOutboxCount})`}</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleDiscardAll}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    background: '#fff',
                                                    color: '#e05244',
                                                    border: `1px solid #fed7d7`,
                                                    borderRadius: '8px',
                                                    padding: '5px 10px',
                                                    fontSize: '11.5px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Trash2 size={13} />
                                                <span>Descartar todos</span>
                                            </button>
                                        </>
                                    )}

                                    <button
                                        type="button"
                                        onClick={loadOutboxMessages}
                                        title="Actualizar cola"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '30px',
                                            height: '30px',
                                            borderRadius: '8px',
                                            border: `1px solid ${DIVIDER}`,
                                            background: '#fff',
                                            color: TEXT_MID,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <RefreshCw size={14} style={{ animation: outboxLoading ? 'spin 1s linear infinite' : 'none' }} />
                                    </button>
                                </div>
                            </div>

                            {outboxLoading && outboxMessages.length === 0 ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                                    <Spinner />
                                </div>
                            ) : outboxMessages.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '24px 16px',
                                    background: '#f8faf9',
                                    borderRadius: '10px',
                                    border: `1px dashed #c6e7d6`,
                                    color: '#2d6a4f',
                                    fontSize: '13px',
                                }}>
                                    <div style={{ fontSize: '22px', marginBottom: '6px' }}>🎉</div>
                                    <div style={{ fontWeight: 600 }}>¡Excelente! No hay mensajes fallidos.</div>
                                    <div style={{ fontSize: '12px', color: TEXT_MID, marginTop: '3px' }}>
                                        Todas las confirmaciones y recordatorios salientes han sido procesados sin errores.
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {outboxMessages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            style={{
                                                border: '1px solid #fecaca',
                                                background: '#fffbfb',
                                                borderRadius: '12px',
                                                padding: '12px 14px',
                                                transition: 'box-shadow 0.15s ease',
                                            }}
                                        >
                                            {/* Cabecera del mensaje fallido */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: TEXT_DARK }}>
                                                        {msg.customerName || msg.recipientPhone}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '10.5px',
                                                        fontWeight: 700,
                                                        background: '#fee2e2',
                                                        color: '#b91c1c',
                                                        padding: '1px 7px',
                                                        borderRadius: '4px',
                                                        fontFamily: 'monospace',
                                                    }}>
                                                        {msg.templateName ? `Plantilla: ${msg.templateName}` : 'Texto plano'}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '10.5px',
                                                        fontWeight: 600,
                                                        background: '#fef3c7',
                                                        color: '#92400e',
                                                        padding: '1px 6px',
                                                        borderRadius: '4px',
                                                    }}>
                                                        Intento #{msg.attemptCount}
                                                    </span>
                                                </div>

                                                <span style={{ fontSize: '11px', color: '#888' }}>
                                                    {msg.formattedLastAttemptAt || msg.formattedCreatedAt || msg.createdAt}
                                                </span>
                                            </div>

                                            {/* Resumen del contenido */}
                                            {msg.summaryContent && (
                                                <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '8px' }}>
                                                    {msg.summaryContent}
                                                </div>
                                            )}

                                            {/* Motivo del error reportado por Meta */}
                                            {msg.lastError && (
                                                <div style={{
                                                    background: '#fff1f2',
                                                    border: '1px solid #ffe4e6',
                                                    borderRadius: '6px',
                                                    padding: '7px 10px',
                                                    fontSize: '11.5px',
                                                    color: '#9f1239',
                                                    lineHeight: 1.4,
                                                    marginBottom: '10px',
                                                    wordBreak: 'break-word',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '6px',
                                                }}>
                                                    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px', color: '#e11d48' }} />
                                                    <div>
                                                        <strong>Error de Meta:</strong> {msg.lastError}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Barra de acciones por mensaje */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                <span style={{ fontSize: '11.5px', color: TEXT_MID, fontFamily: 'monospace' }}>
                                                    +{msg.recipientPhone}
                                                </span>

                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDiscardOne(msg.id)}
                                                        disabled={discardingId === msg.id}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            background: '#edf2f7',
                                                            color: '#4a5568',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            padding: '5px 10px',
                                                            fontSize: '11.5px',
                                                            fontWeight: 600,
                                                            cursor: discardingId === msg.id ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        <Trash2 size={13} />
                                                        <span>Descartar</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRetryOne(msg.id)}
                                                        disabled={retryingId === msg.id}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            background: '#128C7E',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            padding: '5px 12px',
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            cursor: retryingId === msg.id ? 'not-allowed' : 'pointer',
                                                            boxShadow: '0 2px 4px rgba(18, 140, 126, 0.25)',
                                                        }}
                                                    >
                                                        <RefreshCw size={13} style={{ animation: retryingId === msg.id ? 'spin 1s linear infinite' : 'none' }} />
                                                        <span>{retryingId === msg.id ? 'Reintentando...' : 'Reintentar'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </DashCard>

                {/* ══ 3. Citas de Hoy ══════════════════════════════════════ */}
                <DashCard>
                    {/* header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CalendarDays size={20} style={{ color: '#c9897a' }} />
                            <span style={{ fontWeight: 600, fontSize: '15px', color: TEXT_DARK }}>Citas de Hoy</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '9px', textTransform: 'uppercase', color: TEXT_MID, fontWeight: 700, letterSpacing: '0.05em' }}>Total Hoy</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#5a8f7b' }}>{formatCurrency(todayAppointments.filter(apt => apt.status !== 'CANCELLED').reduce((sum, apt) => sum + getAppointmentTotal(apt), 0))}</span>
                            </div>
                            <Link to="/appointments" style={{ fontSize: '13px', color: TEXT_MID, textDecoration: 'underline' }}>
                                Ver todas
                            </Link>
                        </div>
                    </div>

                    {/* Resumen Operacional en Tiempo Real del Día */}
                    {todayStats && todayStats.totalAppointments > 0 && (
                        <div style={{ padding: '0 20px 12px' }}>
                            <div style={{
                                background: 'linear-gradient(135deg, #fffcfb 0%, #fdf5f2 100%)',
                                border: '1px solid #f2cfc2',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                fontSize: '12px',
                            }}>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span style={{ color: '#0d5c4a', fontWeight: 600, background: '#c8e6e0', padding: '3px 8px', borderRadius: '6px' }}>
                                        ✅ {todayStats.completedCount} Completadas ({todayStats.completionRate}%)
                                    </span>
                                    <span style={{ color: '#7c4a00', fontWeight: 600, background: '#fde8cc', padding: '3px 8px', borderRadius: '6px' }}>
                                        ⏳ {todayStats.pendingCount + todayStats.confirmedCount} Por Atender
                                    </span>
                                    {todayStats.collectedRevenue > 0 && (
                                        <span style={{ color: '#2e7d32', fontWeight: 700 }}>
                                            Cobrado: {formatCurrency(todayStats.collectedRevenue)}
                                        </span>
                                    )}
                                </div>

                                {todayStats.nextAppointmentTime && todayStats.nextCustomerName && (
                                    <div style={{ color: '#5c3d2e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <strong>⏰ Próxima:</strong>
                                        <span>{todayStats.nextAppointmentTime.slice(0, 5)} - {todayStats.nextCustomerName} ({todayStats.nextServiceName || 'Servicio'})</span>
                                    </div>
                                )}
                            </div>

                            {/* Alerta de citas con posible atraso o no-show */}
                            {todayStats.potentialNoShowCount > 0 && (
                                <div style={{
                                    marginTop: '8px',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    background: '#fff3cd',
                                    border: '1px solid #ffeeba',
                                    color: '#856404',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <span>⚠️</span>
                                    <span>
                                        Tienes <strong>{todayStats.potentialNoShowCount} cita(s) de hoy</strong> con horario ya cumplido aún pendientes de registrar atención o cancelación.
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Banner de Bloqueos para el día de Hoy */}
                    {todayUnavailabilities.length > 0 && (
                        <div style={{ padding: '0 20px 12px' }}>
                            {todayUnavailabilities.map((u) => (
                                <div
                                    key={u.id}
                                    style={{
                                        padding: '9px 12px',
                                        borderRadius: '10px',
                                        background: u.type === 'FULL_DAY' ? '#ffe0e6' : '#fef3c7',
                                        border: `1px solid ${u.type === 'FULL_DAY' ? '#f87171' : '#f59e0b'}`,
                                        color: u.type === 'FULL_DAY' ? '#991b1b' : '#92400e',
                                        fontSize: '12.5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px',
                                        marginBottom: '6px',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '15px' }}>{u.type === 'FULL_DAY' ? '🚫' : '⏰'}</span>
                                        <div>
                                            <strong>{u.type === 'FULL_DAY' ? 'Día Cerrado / No Disponible:' : `Horario Bloqueado (${u.startTime} a ${u.endTime}):`}</strong> {u.reason}
                                        </div>
                                    </div>
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        padding: '2px 7px',
                                        borderRadius: '5px',
                                        background: u.type === 'FULL_DAY' ? '#f87171' : '#f59e0b',
                                        color: '#fff',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {u.type === 'FULL_DAY' ? 'Cerrado' : 'Bloqueo'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {appointmentsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><Spinner /></div>
                    ) : todayAppointments.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#b09080', fontSize: '14px', padding: '32px 20px' }}>
                            No hay citas programadas para hoy.
                        </p>
                    ) : (
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '340px' }}>
                                <thead>
                                    <tr style={{ borderTop: DIVIDER }}>
                                        {['Hora', 'Cliente', 'Servicio', 'Valor', 'Estado', 'Acciones'].map(h => (
                                            <th key={h} style={{
                                                textAlign: 'left', padding: '10px 12px',
                                                fontSize: '11px', fontWeight: 700,
                                                textTransform: 'uppercase', letterSpacing: '0.05em',
                                                color: TEXT_DARK, whiteSpace: 'nowrap',
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {todayAppointments.slice(0, 5).map((apt: Appointment, idx: number) => (
                                        <tr
                                            key={apt.id}
                                            style={{
                                                borderTop: DIVIDER,
                                                background: idx % 2 !== 0 ? '#fdf6f3' : '#fff',
                                            }}
                                        >
                                            <td style={{ padding: '12px', color: TEXT_DARK, whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '12px' }}>
                                                {apt.appointmentTime ? apt.appointmentTime.slice(0, 5) : '-'}
                                            </td>
                                            <td style={{ padding: '12px', color: TEXT_DARK }}>
                                                <div style={{ fontWeight: 600, color: TEXT_DARK }}>
                                                    {apt.customer.fullName}
                                                </div>
                                                {apt.customer.rut && apt.customer.rut.trim() ? (
                                                    <div style={{ fontSize: '11px', color: '#7a5c50', marginTop: '2px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ color: '#a07d6c', fontWeight: 600 }}>RUT:</span>
                                                        <span>{formatRutWithDots(apt.customer.rut)}</span>
                                                    </div>
                                                ) : (
                                                    <div style={{ marginTop: '3px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/appointments?edit=${apt.id}&returnTo=/dashboard`)}
                                                            title="Clienta sin RUT registrado. Clic para editar cita/cliente"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '3px',
                                                                background: '#fff3cd',
                                                                color: '#856404',
                                                                border: '1px solid #ffeeba',
                                                                borderRadius: '4px',
                                                                padding: '1px 6px',
                                                                fontSize: '10.5px',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            ⚠️ Sin RUT (Corregir)
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px', color: '#7a5c50' }}>
                                                {getAppointmentServices(apt).map((s: ServiceSummary) => s.name).join(' + ') || '-'}
                                            </td>
                                            <td style={{ padding: '12px', color: '#5a8f7b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                {formatCurrency(getAppointmentTotal(apt))}
                                            </td>
                                            <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    ...statusPillStyle(apt.status),
                                                    display: 'inline-block',
                                                    borderRadius: '999px',
                                                    padding: '3px 10px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                }}>
                                                    {statusLabel(apt.status)}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {apt.status === AppointmentStatus.RESCHEDULE_REQUESTED && (
                                                        <a
                                                            href={getWhatsAppUrlForReschedule(apt)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Contactar por WhatsApp para coordinar nueva hora"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '5px',
                                                                border: '1px solid #25D366',
                                                                background: '#e8f7ee',
                                                                color: '#128C7E',
                                                                borderRadius: '999px',
                                                                padding: '4px 11px',
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                textDecoration: 'none',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 4px rgba(37, 211, 102, 0.25)',
                                                            }}
                                                        >
                                                            <FaWhatsapp size={13} style={{ color: '#25D366' }} />
                                                            <span>WhatsApp</span>
                                                        </a>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/appointments?edit=${apt.id}&returnTo=/dashboard`)}
                                                        style={{
                                                            border: '1px solid #d4a89a',
                                                            background: '#fff8f5',
                                                            color: '#7c3a2d',
                                                            borderRadius: '999px',
                                                            padding: '4px 10px',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/appointments?reschedule=${apt.id}&returnTo=/dashboard`)}
                                                        style={{
                                                            border: '1px solid #b6d8cb',
                                                            background: '#eaf7f2',
                                                            color: '#1f6b52',
                                                            borderRadius: '999px',
                                                            padding: '4px 10px',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Reagendar
                                                    </button>
                                                    {apt.status !== AppointmentStatus.COMPLETED && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCompleteDialog({ show: true, appointmentId: apt.id })}
                                                            style={{
                                                                border: '1px solid #c8e6e0',
                                                                background: '#e0f5f0',
                                                                color: '#0d5c4a',
                                                                borderRadius: '999px',
                                                                padding: '4px 10px',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            Completar
                                                        </button>
                                                    )}
                                                    {apt.status !== AppointmentStatus.CANCELLED && apt.status !== AppointmentStatus.COMPLETED && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCancelAppointment(apt.id)}
                                                            style={{
                                                                border: '1px solid #f5bfbf',
                                                                background: '#fce4e4',
                                                                color: '#7c1c1c',
                                                                borderRadius: '999px',
                                                                padding: '4px 10px',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            Cancelar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {todayAppointments.length > 5 && (
                                <div style={{ textAlign: 'center', padding: '10px', borderTop: DIVIDER }}>
                                    <Link to="/appointments" style={{ fontSize: '12px', color: TEXT_MID, textDecoration: 'underline' }}>
                                        Ver {todayAppointments.length - 5} más…
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </DashCard>

                {/* ══ 4. Resumen Semanal ═══════════════════════════════════ */}
                <DashCard style={{ padding: CARD_PAD }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={18} style={{ color: '#c9897a' }} />
                            <span style={{ fontWeight: 600, fontSize: '15px', color: TEXT_DARK }}>Resumen Semanal</span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '20px', color: '#5a8f7b' }}>
                            {thisWeekAppointments.length}
                        </span>
                    </div>
                    <div>
                        {weekStats.map(({ label, count, bg, color }, i) => (
                            <div key={label} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '9px 0',
                                borderBottom: i < weekStats.length - 1 ? DIVIDER : 'none',
                            }}>
                                <span style={{ fontSize: '14px', color: TEXT_MID }}>{label}</span>
                                <span style={{
                                    background: bg, color, fontSize: '12px', fontWeight: 700,
                                    borderRadius: '999px', padding: '2px 10px', minWidth: '28px', textAlign: 'center',
                                }}>{count}</span>
                            </div>
                        ))}
                    </div>
                </DashCard>

                {/* ══ 5. Insights de negocio ═══════════════════════════════ */}
                <DashCard style={{ padding: CARD_PAD }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TrendingUp size={18} style={{ color: '#c9897a' }} />
                            <span style={{ fontWeight: 600, fontSize: '15px', color: TEXT_DARK }}>Insights del Mes</span>
                        </div>
                        <Link to="/analytics" style={{ fontSize: '12px', color: TEXT_MID, textDecoration: 'underline' }}>
                            Ver Analíticas &rarr;
                        </Link>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: DIVIDER }}>
                        <div>
                            <span style={{ fontSize: '14px', color: TEXT_DARK, fontWeight: 500, display: 'block' }}>Ingresos Reales (Cobrados)</span>
                            <span style={{ fontSize: '11px', color: TEXT_MID }}>{dashboardStats?.completedAppointmentsMonth ?? 0} citas atendidas</span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '16px', color: '#2d6b55' }}>
                            {formatCurrency(dashboardStats?.completedRevenueMonth ?? 0)}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: DIVIDER }}>
                        <div>
                            <span style={{ fontSize: '14px', color: TEXT_MID, display: 'block' }}>Ingresos Proyectados</span>
                            <span style={{ fontSize: '11px', color: TEXT_MID }}>{dashboardStats?.totalAppointmentsMonth ?? 0} citas activas en el mes</span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '16px', color: '#5a8f7b' }}>
                            {formatCurrency(dashboardStats?.totalRevenueMonth || 0)}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: DIVIDER, gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <Users size={14} style={{ color: '#b09080' }} />
                            <div>
                                <span style={{ fontSize: '14px', color: TEXT_MID, display: 'block' }}>Clienta Destacada</span>
                                <span style={{ fontSize: '11px', color: TEXT_MID }}>Mayor frecuencia este mes</span>
                            </div>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: TEXT_DARK, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }} title={dashboardStats?.topCustomer ? `${dashboardStats.topCustomer.name} (${dashboardStats.topCustomer.appointmentCount} visitas - ${formatCurrency(dashboardStats.topCustomer.totalSpent)})` : undefined}>
                            {dashboardStats?.topCustomer ? `${dashboardStats.topCustomer.name} (${dashboardStats.topCustomer.appointmentCount} visitas)` : 'Sin datos'}
                        </span>
                    </div>

                    <div style={{ paddingTop: '16px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b09080', marginBottom: '12px' }}>
                            Ranking de Servicios
                        </div>
                        {!dashboardStats?.topServices || dashboardStats.topServices.length === 0 ? (
                            <p style={{ fontSize: '13px', color: '#c9a898' }}>Aún no hay datos de servicios.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {dashboardStats.topServices.map((s: any) => {
                                    const maxRevenue = Math.max(...dashboardStats.topServices.map((ts: any) => ts.revenue), 1);
                                    const percentage = (s.revenue / maxRevenue) * 100;
                                    return (
                                        <div key={s.name}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '13px', color: TEXT_DARK, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {s.name}
                                                </span>
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_DARK }}>
                                                    {formatCurrency(s.revenue)}
                                                </span>
                                            </div>
                                            <div style={{ height: '6px', background: '#f3e9e2', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ 
                                                    height: '100%', 
                                                    width: `${percentage}%`, 
                                                    background: 'linear-gradient(90deg, #c9897a, #e5b2a7)',
                                                    borderRadius: '3px',
                                                    transition: 'width 1s ease-in-out'
                                                }} />
                                            </div>
                                            <div style={{ fontSize: '10px', color: TEXT_MID, marginTop: '2px' }}>
                                                {s.count} servicios realizados este mes
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </DashCard>

                {/* ══ 6. Calendario del Mes (no interactivo) ═══════════════ */}
                <DashCard style={{ padding: CARD_PAD }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CalendarDays size={18} style={{ color: '#c9897a' }} />
                            <span style={{ fontWeight: 600, fontSize: '15px', color: TEXT_DARK }}>
                                Calendario del Mes
                            </span>
                        </div>
                        <span style={{ fontSize: '13px', color: TEXT_MID, textTransform: 'capitalize' }}>
                            {format(calendarMonth, 'MMMM yyyy', { locale: es })}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.9rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '11px', color: TEXT_MID }}>
                            <i style={{ width: '10px', height: '10px', borderRadius: '50%', background: calendarDisplayConfig.morning.color, display: 'inline-block' }} />
                            {calendarDisplayConfig.morning.start}-{calendarDisplayConfig.morning.end}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '11px', color: TEXT_MID }}>
                            <i style={{ width: '10px', height: '10px', borderRadius: '50%', background: calendarDisplayConfig.afternoon.color, display: 'inline-block' }} />
                            {calendarDisplayConfig.afternoon.start}-{calendarDisplayConfig.afternoon.end}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '11px', color: TEXT_MID }}>
                            <i style={{ width: '10px', height: '10px', borderRadius: '50%', background: calendarDisplayConfig.night.color, display: 'inline-block' }} />
                            {calendarDisplayConfig.night.start}-{calendarDisplayConfig.night.end}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '11px', color: '#991b1b', fontWeight: 600, background: unavailabilityColors.fullDayColor, padding: '1px 6px', borderRadius: '6px' }}>
                            <i style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
                            Cerrado
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '11px', color: '#92400e', fontWeight: 600, background: unavailabilityColors.timeSlotColor, padding: '1px 6px', borderRadius: '6px' }}>
                            <i style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                            Bloqueo
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.35rem', marginBottom: '0.4rem' }}>
                        {weekDayNames.map((day) => (
                            <div key={day} style={{ textAlign: 'center', fontWeight: 600, fontSize: '12px', color: TEXT_MID }}>
                                {day}
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.35rem' }}>
                        {monthCalendarCells.map((cell, idx) => {
                            let cellBg = cell.isToday ? 'linear-gradient(135deg, #fdf6f3 0%, #fce8e4 100%)' : '#fffdfc';
                            let cellBorder = '1px solid #f0e0d8';
                            if (cell.isFullDayBlocked) {
                                cellBg = unavailabilityColors.fullDayColor;
                                cellBorder = '1px solid #f87171';
                            } else if (cell.isTimeSlotBlocked) {
                                cellBg = unavailabilityColors.timeSlotColor;
                                cellBorder = '1px solid #f59e0b';
                            }

                            return (
                                <div
                                    key={idx}
                                    style={{
                                        minHeight: '62px',
                                        border: cellBorder,
                                        borderRadius: '12px',
                                        padding: '0.35rem',
                                        background: cellBg,
                                        opacity: cell.isOutsideMonth ? 0.48 : 1,
                                    }}
                                    title={cell.isFullDayBlocked ? `Cerrado: ${cell.blockReason}` : cell.isTimeSlotBlocked ? `Bloqueo: ${cell.timeSlotReason}` : undefined}
                                >
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_DARK, marginBottom: '0.2rem' }}>
                                        {format(cell.date, 'd')}
                                    </div>
                                    {cell.isFullDayBlocked && (
                                        <div style={{ fontSize: '8.5px', color: '#991b1b', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            🚫 {cell.blockReason}
                                        </div>
                                    )}
                                    {!cell.isFullDayBlocked && cell.isTimeSlotBlocked && (
                                        <div style={{ fontSize: '8.5px', color: '#92400e', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            ⏰ {cell.timeSlotReason}
                                        </div>
                                    )}
                                    {cell.appointmentCount > 0 && (
                                        <>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.18rem', minHeight: '12px', marginTop: '2px' }}>
                                                {cell.dotColors.map((color, dotIndex) => (
                                                    <span
                                                        key={dotIndex}
                                                        style={{
                                                            width: '0.34rem',
                                                            height: '0.34rem',
                                                            borderRadius: '999px',
                                                            backgroundColor: color,
                                                            display: 'inline-block',
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <div style={{ marginTop: '0.15rem', fontSize: '9px', color: TEXT_MID, fontWeight: 600 }}>
                                                {cell.appointmentCount === 1 ? '1 cita' : `${cell.appointmentCount} citas`}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </DashCard>

            </div>

            <CompleteAppointmentWithSuppliesModal
                show={completeDialog.show}
                appointmentId={completeDialog.appointmentId}
                onHide={() => setCompleteDialog({ show: false, appointmentId: null })}
                onCompleted={async () => {
                    await fetchAppointments();
                    try {
                        const stats = await statsApi.getDashboardStats();
                        setDashboardStats(stats);
                    } catch (e) {
                        console.error('Error refreshing stats after appointment complete:', e);
                    }
                }}
            />

            {cancelingAppointmentId && (
                <CancelAppointmentDialog
                    show={showCancelModal}
                    appointmentId={cancelingAppointmentId}
                    customerName={appointments.find((apt) => apt.id === cancelingAppointmentId)?.customer.fullName}
                    appointmentDate={appointments.find((apt) => apt.id === cancelingAppointmentId)?.appointmentDate}
                    appointmentTime={appointments.find((apt) => apt.id === cancelingAppointmentId)?.appointmentTime}
                    onConfirm={handleConfirmCancelAppointment}
                    onCancel={() => {
                        setShowCancelModal(false);
                        setCancelingAppointmentId(null);
                    }}
                    isLoading={isCancelLoading}
                />
            )}

            {/* Modal de Cierre de Caja */}
            <CashClosingModal
                show={showCashClosingModal}
                onHide={() => setShowCashClosingModal(false)}
            />
        </DashboardLayout>
    );
}
