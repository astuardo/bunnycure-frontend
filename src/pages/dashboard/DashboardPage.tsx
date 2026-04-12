import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isToday, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    CalendarDays,
    UserPlus,
    Mail,
    Scissors,
    Zap,
    BarChart3,
    TrendingUp,
    Users,
} from 'lucide-react';
import DashboardLayout from '@/components/common/DashboardLayout';
import { useAppointmentsStore } from '@/stores/appointmentsStore';
import { useBookingRequestsStore } from '@/stores/bookingRequestsStore';
import { useCustomersStore } from '@/stores/customersStore';
import { Appointment, AppointmentStatus } from '@/types/appointment.types';
import { BookingRequest } from '@/types/booking.types';
import { ServiceSummary } from '@/types/service.types';

// ─── helpers ────────────────────────────────────────────────────────────────

function getAppointmentServices(apt: Appointment): ServiceSummary[] {
    if (apt.services && apt.services.length > 0) return apt.services;
    return apt.service ? [apt.service] : [];
}

function getAppointmentTotal(apt: Appointment): number {
    if (typeof apt.totalPrice === 'number') return apt.totalPrice;
    return getAppointmentServices(apt).reduce((sum: number, s: ServiceSummary) => sum + s.price, 0);
}

function statusLabel(status: AppointmentStatus): string {
    const map: Record<AppointmentStatus, string> = {
        PENDING:   'Pendiente',
        CONFIRMED: 'Confirmada',
        COMPLETED: 'Completada',
        CANCELLED: 'Cancelada',
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
        default:
            return { background: '#e9ecef', color: '#495057' };
    }
}

interface StatEntry { name: string; count: number; total: number; }

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

function ActionButton({ icon, label, to, variant }: {
    icon: React.ReactNode; label: string; to: string; variant: ActionVariant;
}) {
    const s = variantStyles[variant];
    return (
        <Link to={to} style={{ display: 'block', textDecoration: 'none' }}>
            <div
                style={{
                    background: s.bg,
                    borderRadius: '12px',
                    padding: '12px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    minHeight: '72px',
                    textAlign: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = s.hover)}
                onMouseLeave={e => (e.currentTarget.style.background = s.bg)}
            >
                <span style={{ color: s.icon, display: 'flex' }}>{icon}</span>
                <span style={{
                    color: s.text,
                    fontSize: '12px',
                    fontWeight: 600,
                    lineHeight: '1.3',
                    wordBreak: 'break-word',
                    width: '100%',
                }}>
                    {label}
                </span>
            </div>
        </Link>
    );
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

// ─── main page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const navigate = useNavigate();
    const { appointments, isLoading: appointmentsLoading, fetchAppointments } = useAppointmentsStore();
    const { bookingRequests, fetchBookingRequests } = useBookingRequestsStore();
    const { customers, fetchCustomers } = useCustomersStore();
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setStatsLoading(true);
            await Promise.all([fetchAppointments(), fetchBookingRequests(), fetchCustomers()]);
            setStatsLoading(false);
        };
        load();
    }, [fetchAppointments, fetchBookingRequests, fetchCustomers]);

    const todayAppointments = appointments.filter(
        (apt: Appointment) => apt.appointmentDate && isToday(parseISO(apt.appointmentDate))
    );
    const thisWeekAppointments = appointments.filter((apt: Appointment) => {
        if (!apt.appointmentDate) return false;
        const d = parseISO(apt.appointmentDate);
        const weekStart = startOfWeek(new Date(), { locale: es });
        const weekEnd   = endOfWeek(new Date(),   { locale: es });
        return d >= weekStart && d <= weekEnd;
    });
    const pendingRequests = bookingRequests.filter((r: BookingRequest) => r.status === 'PENDING');
    const revenueAppointments = appointments.filter((a: Appointment) => a.status !== AppointmentStatus.CANCELLED);
    const totalValue = revenueAppointments.reduce((acc: number, apt: Appointment) => acc + getAppointmentTotal(apt), 0);

    const serviceStats = revenueAppointments.reduce<Record<number, StatEntry>>(
        (acc, apt: Appointment) => {
            getAppointmentServices(apt).forEach((s: ServiceSummary) => {
                if (!acc[s.id]) acc[s.id] = { name: s.name, count: 0, total: 0 };
                acc[s.id].count += 1;
                acc[s.id].total += s.price;
            });
            return acc;
        }, {}
    );
    const topServices: StatEntry[] = Object.values(serviceStats)
        .sort((a, b) => b.count - a.count || b.total - a.total).slice(0, 3);

    const customerStats = revenueAppointments.reduce<Record<number, StatEntry>>(
        (acc, apt: Appointment) => {
            const cid = apt.customer?.id;
            if (!cid) return acc;
            if (!acc[cid]) acc[cid] = { name: apt.customer.fullName, count: 0, total: 0 };
            acc[cid].count += 1;
            acc[cid].total += getAppointmentTotal(apt);
            return acc;
        }, {}
    );
    const topCustomer: StatEntry | undefined = Object.values(customerStats)
        .sort((a, b) => b.count - a.count || b.total - a.total)[0];

    const weekStats = [
        { label: 'Confirmadas', count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.CONFIRMED).length, bg: '#d4edda', color: '#155724' },
        { label: 'Completadas', count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.COMPLETED).length, bg: '#c8e6e0', color: '#0d5c4a' },
        { label: 'Pendientes',  count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.PENDING).length,   bg: '#fde8cc', color: '#7c4a00' },
        { label: 'Canceladas',  count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.CANCELLED).length,  bg: '#fce4e4', color: '#7c1c1c' },
    ];

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
                    {/* Grid 2×2 — ícono arriba, texto abajo para evitar desborde */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <ActionButton icon={<CalendarDays size={22} />} label="Nueva Cita"          to="/appointments?create=1&returnTo=%2Fdashboard"    variant="rose" />
                        <ActionButton icon={<UserPlus    size={22} />} label="Nuevo Cliente"        to="/customers?create=1&returnTo=%2Fdashboard"       variant="mint" />
                        <ActionButton
                            icon={<Mail size={22} />}
                            label={`Ver Solicitudes${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`}
                            to="/booking-requests"
                            variant="beige"
                        />
                        <ActionButton icon={<Scissors   size={22} />} label="Gestionar Servicios"  to="/services"        variant="sky"  />
                    </div>
                </DashCard>

                {/* ══ 3. Citas de Hoy ══════════════════════════════════════ */}
                <DashCard>
                    {/* header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CalendarDays size={20} style={{ color: '#c9897a' }} />
                            <span style={{ fontWeight: 600, fontSize: '15px', color: TEXT_DARK }}>Citas de Hoy</span>
                        </div>
                        <Link to="/appointments" style={{ fontSize: '13px', color: TEXT_MID, textDecoration: 'underline' }}>
                            Ver todas
                        </Link>
                    </div>

                    {appointmentsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><Spinner /></div>
                    ) : todayAppointments.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#b09080', fontSize: '14px', padding: '32px 20px' }}>
                            No hay citas programadas para hoy.
                        </p>
                    ) : (
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '380px' }}>
                                <thead>
                                    <tr style={{ borderTop: DIVIDER }}>
                                        {['Hora', 'Cliente', 'Servicio', 'Estado'].map(h => (
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
                                            onClick={() => navigate('/appointments')}
                                            style={{
                                                borderTop: DIVIDER, cursor: 'pointer',
                                                background: idx % 2 !== 0 ? '#fdf6f3' : '#fff',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#fdeae4')}
                                            onMouseLeave={e => (e.currentTarget.style.background = idx % 2 !== 0 ? '#fdf6f3' : '#fff')}
                                        >
                                            <td style={{ padding: '12px', color: TEXT_DARK, whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '12px' }}>
                                                {apt.appointmentTime || '-'}
                                            </td>
                                            <td style={{ padding: '12px', color: TEXT_DARK, fontWeight: 500 }}>
                                                {apt.customer.fullName}
                                            </td>
                                            <td style={{ padding: '12px', color: '#7a5c50' }}>
                                                {getAppointmentServices(apt).map((s: ServiceSummary) => s.name).join(' + ') || '-'}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <TrendingUp size={18} style={{ color: '#c9897a' }} />
                        <span style={{ fontWeight: 600, fontSize: '15px', color: TEXT_DARK }}>Insights de negocio</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: DIVIDER }}>
                        <span style={{ fontSize: '14px', color: TEXT_MID }}>Valor citas creadas</span>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#5a8f7b' }}>
                            ${totalValue.toLocaleString('es-CL')}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: DIVIDER, gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <Users size={14} style={{ color: '#b09080' }} />
                            <span style={{ fontSize: '14px', color: TEXT_MID }}>Cliente más frecuente</span>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: TEXT_DARK, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                            {topCustomer ? `${topCustomer.name} (${topCustomer.count})` : 'Sin datos'}
                        </span>
                    </div>

                    <div style={{ paddingTop: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b09080', marginBottom: '10px' }}>
                            Top servicios
                        </div>
                        {topServices.length === 0 ? (
                            <p style={{ fontSize: '13px', color: '#c9a898' }}>Aún no hay datos de servicios.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {topServices.map((s: StatEntry) => (
                                    <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '13px', color: TEXT_DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {s.name}
                                        </span>
                                        <span style={{ fontSize: '12px', color: TEXT_MID, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                            {s.count} uso{s.count !== 1 ? 's' : ''} · ${s.total.toLocaleString('es-CL')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DashCard>

            </div>
        </DashboardLayout>
    );
}
