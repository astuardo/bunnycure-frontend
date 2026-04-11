import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isToday, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    CalendarDays,
    UserPlus,
    Mail,
    Scissors,
    Zap,
    BarChart3,
    Users,
    TrendingUp,
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

function statusPill(status: AppointmentStatus): string {
    const base = 'inline-block rounded-full text-xs font-semibold px-3 py-1 whitespace-nowrap';
    switch (status) {
        case AppointmentStatus.PENDING:
            return `${base} bg-orange-100 text-orange-800`;
        case AppointmentStatus.CONFIRMED:
            return `${base} bg-emerald-100 text-emerald-800`;
        case AppointmentStatus.COMPLETED:
            return `${base} bg-teal-100 text-teal-800`;
        case AppointmentStatus.CANCELLED:
            return `${base} bg-rose-100 text-rose-700`;
        default:
            return `${base} bg-stone-100 text-stone-600`;
    }
}

// ─── types ───────────────────────────────────────────────────────────────────

interface StatEntry {
    name: string;
    count: number;
    total: number;
}

// ─── sub-components ──────────────────────────────────────────────────────────

/** Líneas decorativas a ambos lados del título — igual que en front.jpeg */
function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <span className="flex-1 h-px" style={{ background: '#d4a89a' }} />
            <span
                className="text-base font-medium tracking-wide whitespace-nowrap"
                style={{ color: '#8b6f5e' }}
            >
                {children}
            </span>
            <span className="flex-1 h-px" style={{ background: '#d4a89a' }} />
        </div>
    );
}

/** Tarjeta blanca con bordes redondeados y sombra suave */
function DashCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`rounded-3xl border ${className}`}
            style={{
                background: 'rgba(255,255,255,0.85)',
                borderColor: 'rgba(240,224,216,0.6)',
                boxShadow: '0 2px 16px rgba(180,120,100,0.08)',
            }}
        >
            {children}
        </div>
    );
}

/** Botón de acción rápida — grid 2×2 con colores pastel distintos */
type ActionVariant = 'rose' | 'mint' | 'beige' | 'sky';

const variantStyles: Record<ActionVariant, { bg: string; hover: string; text: string; iconColor: string }> = {
    rose:  { bg: '#fce8e4', hover: '#f9d5cf', text: '#7c3a2d', iconColor: '#c9897a' },
    mint:  { bg: '#e8f5f0', hover: '#d4ede6', text: '#2d6b55', iconColor: '#5a9e82' },
    beige: { bg: '#f5ede8', hover: '#eeddd6', text: '#6b4c38', iconColor: '#b07a5e' },
    sky:   { bg: '#e8f0f8', hover: '#d4e4f2', text: '#2d4f7c', iconColor: '#5a7eb0' },
};

function ActionButton({
    icon,
    label,
    to,
    variant,
}: {
    icon: React.ReactNode;
    label: string;
    to: string;
    variant: ActionVariant;
}) {
    const s = variantStyles[variant];
    return (
        <Link to={to} className="block">
            <button
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 active:scale-95"
                style={{ background: s.bg, color: s.text }}
                onMouseEnter={e => (e.currentTarget.style.background = s.hover)}
                onMouseLeave={e => (e.currentTarget.style.background = s.bg)}
            >
                <span style={{ color: s.iconColor }} className="shrink-0">{icon}</span>
                <span className="text-left leading-tight">{label}</span>
            </button>
        </Link>
    );
}

/** Spinner rosa */
function Spinner() {
    return (
        <div
            className="w-7 h-7 rounded-full animate-spin"
            style={{ border: '3px solid #f0d0c8', borderTopColor: '#c9897a' }}
        />
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

    // ── derived stats ──────────────────────────────────────────────────────
    const todayAppointments = appointments.filter(
        (apt: Appointment) => apt.appointmentDate && isToday(new Date(apt.appointmentDate))
    );

    const thisWeekAppointments = appointments.filter((apt: Appointment) => {
        if (!apt.appointmentDate) return false;
        const d = new Date(apt.appointmentDate);
        const weekStart = startOfWeek(new Date(), { locale: es });
        const weekEnd   = endOfWeek(new Date(),   { locale: es });
        return d >= weekStart && d <= weekEnd;
    });

    const pendingRequests = bookingRequests.filter((r: BookingRequest) => r.status === 'PENDING');

    const revenueAppointments = appointments.filter(
        (a: Appointment) => a.status !== AppointmentStatus.CANCELLED
    );
    const totalValue = revenueAppointments.reduce(
        (acc: number, apt: Appointment) => acc + getAppointmentTotal(apt),
        0
    );

    const serviceStats = revenueAppointments.reduce<Record<number, StatEntry>>(
        (acc: Record<number, StatEntry>, apt: Appointment) => {
            getAppointmentServices(apt).forEach((s: ServiceSummary) => {
                if (!acc[s.id]) acc[s.id] = { name: s.name, count: 0, total: 0 };
                acc[s.id].count += 1;
                acc[s.id].total += s.price;
            });
            return acc;
        },
        {}
    );

    const topServices: StatEntry[] = Object.values(serviceStats)
        .sort((a: StatEntry, b: StatEntry) => b.count - a.count || b.total - a.total)
        .slice(0, 3);

    const customerStats = revenueAppointments.reduce<Record<number, StatEntry>>(
        (acc: Record<number, StatEntry>, apt: Appointment) => {
            const cid = apt.customer?.id;
            if (!cid) return acc;
            if (!acc[cid]) acc[cid] = { name: apt.customer.fullName, count: 0, total: 0 };
            acc[cid].count += 1;
            acc[cid].total += getAppointmentTotal(apt);
            return acc;
        },
        {}
    );

    const topCustomer: StatEntry | undefined = Object.values(customerStats).sort(
        (a: StatEntry, b: StatEntry) => b.count - a.count || b.total - a.total
    )[0];

    const weekStats = [
        {
            label: 'Confirmadas',
            count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.CONFIRMED).length,
            pillBg: '#d4edda', pillText: '#155724',
        },
        {
            label: 'Completadas',
            count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.COMPLETED).length,
            pillBg: '#c8e6e0', pillText: '#0d5c4a',
        },
        {
            label: 'Pendientes',
            count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.PENDING).length,
            pillBg: '#fde8cc', pillText: '#7c4a00',
        },
        {
            label: 'Canceladas',
            count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.CANCELLED).length,
            pillBg: '#fce4e4', pillText: '#7c1c1c',
        },
    ];

    // ── render ─────────────────────────────────────────────────────────────
    return (
        <DashboardLayout>
            {/* Fondo rosa pastel general */}
            <div
                className="min-h-screen px-4 py-6 space-y-4"
                style={{ background: '#fdf0ec' }}
            >
                {/* ══ 1. Clientes Activos ══════════════════════════════════ */}
                <DashCard className="px-6 py-7 text-center">
                    <SectionTitle>Clientes Activos</SectionTitle>
                    {statsLoading ? (
                        <div className="flex justify-center py-4"><Spinner /></div>
                    ) : (
                        <>
                            <p
                                className="font-light leading-none tracking-tight mb-1"
                                style={{ fontSize: '5rem', color: '#5a8f7b' }}
                            >
                                {customers.length}
                            </p>
                            <p className="text-sm mt-2" style={{ color: '#9e7b6e' }}>
                                Total registrados
                            </p>
                        </>
                    )}
                </DashCard>

                {/* ══ 2. Acciones Rápidas ══════════════════════════════════ */}
                <DashCard className="px-5 py-6">
                    <SectionTitle>
                        <Zap size={15} className="inline-block mr-1.5 -mt-px" style={{ color: '#e8a838' }} />
                        Acciones Rápidas
                    </SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                        <ActionButton
                            icon={<CalendarDays size={18} />}
                            label="Nueva Cita"
                            to="/appointments"
                            variant="rose"
                        />
                        <ActionButton
                            icon={<UserPlus size={18} />}
                            label="Nuevo Cliente"
                            to="/customers"
                            variant="mint"
                        />
                        <ActionButton
                            icon={<Mail size={18} />}
                            label={`Ver Solicitudes${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`}
                            to="/booking-requests"
                            variant="beige"
                        />
                        <ActionButton
                            icon={<Scissors size={18} />}
                            label="Gestionar Servicios"
                            to="/services"
                            variant="sky"
                        />
                    </div>
                </DashCard>

                {/* ══ 3. Citas de Hoy ══════════════════════════════════════ */}
                <DashCard className="overflow-hidden">
                    {/* header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-4">
                        <div className="flex items-center gap-2">
                            <CalendarDays size={20} style={{ color: '#c9897a' }} />
                            <h2
                                className="font-semibold text-base m-0"
                                style={{ color: '#5c3d2e' }}
                            >
                                Citas de Hoy
                            </h2>
                        </div>
                        <Link
                            to="/appointments"
                            className="text-sm underline underline-offset-2 transition-colors"
                            style={{ color: '#9e7b6e' }}
                        >
                            Ver todas
                        </Link>
                    </div>

                    {/* body */}
                    {appointmentsLoading ? (
                        <div className="flex justify-center py-10"><Spinner /></div>
                    ) : todayAppointments.length === 0 ? (
                        <p
                            className="text-center text-sm py-10 px-5"
                            style={{ color: '#b09080' }}
                        >
                            No hay citas programadas para hoy.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderTop: '1px solid #f0e0d8' }}>
                                        {['Hora', 'Cliente', 'Servicio', 'Estado'].map(h => (
                                            <th
                                                key={h}
                                                className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                                                style={{ color: '#5c3d2e' }}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {todayAppointments.slice(0, 5).map((apt: Appointment, idx: number) => (
                                        <tr
                                            key={apt.id}
                                            onClick={() => navigate('/appointments')}
                                            className="cursor-pointer transition-colors"
                                            style={{
                                                borderTop: '1px solid #f0e0d8',
                                                background: idx % 2 !== 0 ? '#fdf6f3' : '#ffffff',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#fdeae4')}
                                            onMouseLeave={e => (e.currentTarget.style.background = idx % 2 !== 0 ? '#fdf6f3' : '#ffffff')}
                                        >
                                            <td
                                                className="px-4 py-4 whitespace-nowrap font-mono text-xs"
                                                style={{ color: '#5c3d2e' }}
                                            >
                                                {apt.appointmentTime || '-'}
                                            </td>
                                            <td className="px-4 py-4 font-medium" style={{ color: '#5c3d2e' }}>
                                                {apt.customer.fullName}
                                            </td>
                                            <td className="px-4 py-4" style={{ color: '#7a5c50' }}>
                                                {getAppointmentServices(apt)
                                                    .map((s: ServiceSummary) => s.name)
                                                    .join(' + ') || '-'}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={statusPill(apt.status)}>
                                                    {statusLabel(apt.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {todayAppointments.length > 5 && (
                                <div
                                    className="text-center py-3"
                                    style={{ borderTop: '1px solid #f0e0d8' }}
                                >
                                    <Link
                                        to="/appointments"
                                        className="text-xs underline underline-offset-2"
                                        style={{ color: '#9e7b6e' }}
                                    >
                                        Ver {todayAppointments.length - 5} más…
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </DashCard>

                {/* ══ 4. Resumen Semanal ═══════════════════════════════════ */}
                <DashCard className="px-5 py-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={18} style={{ color: '#c9897a' }} />
                            <h2 className="font-semibold text-base m-0" style={{ color: '#5c3d2e' }}>
                                Resumen Semanal
                            </h2>
                        </div>
                        <span className="font-bold text-xl leading-none" style={{ color: '#5a8f7b' }}>
                            {thisWeekAppointments.length}
                        </span>
                    </div>
                    <div className="space-y-1">
                        {weekStats.map(({ label, count, pillBg, pillText }) => (
                            <div
                                key={label}
                                className="flex justify-between items-center py-2"
                                style={{ borderBottom: '1px solid #f0e0d8' }}
                            >
                                <span className="text-sm" style={{ color: '#9e7b6e' }}>{label}</span>
                                <span
                                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                                    style={{ background: pillBg, color: pillText }}
                                >
                                    {count}
                                </span>
                            </div>
                        ))}
                    </div>
                </DashCard>

                {/* ══ 5. Insights de negocio ═══════════════════════════════ */}
                <DashCard className="px-5 py-5">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={18} style={{ color: '#c9897a' }} />
                        <h2 className="font-semibold text-base m-0" style={{ color: '#5c3d2e' }}>
                            Insights de negocio
                        </h2>
                    </div>

                    <div
                        className="flex justify-between items-center py-2.5"
                        style={{ borderBottom: '1px solid #f0e0d8' }}
                    >
                        <span className="text-sm" style={{ color: '#9e7b6e' }}>Valor citas creadas</span>
                        <span className="font-bold text-sm" style={{ color: '#5a8f7b' }}>
                            ${totalValue.toLocaleString('es-CL')}
                        </span>
                    </div>

                    <div
                        className="flex justify-between items-center py-2.5"
                        style={{ borderBottom: '1px solid #f0e0d8' }}
                    >
                        <div className="flex items-center gap-1.5">
                            <Users size={14} style={{ color: '#b09080' }} className="shrink-0" />
                            <span className="text-sm" style={{ color: '#9e7b6e' }}>Cliente más frecuente</span>
                        </div>
                        <span
                            className="font-semibold text-sm text-right max-w-[55%] truncate"
                            style={{ color: '#5c3d2e' }}
                        >
                            {topCustomer ? `${topCustomer.name} (${topCustomer.count})` : 'Sin datos'}
                        </span>
                    </div>

                    <div className="pt-3">
                        <p
                            className="text-xs uppercase tracking-widest mb-3"
                            style={{ color: '#b09080' }}
                        >
                            Top servicios
                        </p>
                        {topServices.length === 0 ? (
                            <p className="text-xs" style={{ color: '#c9a898' }}>
                                Aún no hay datos de servicios.
                            </p>
                        ) : (
                            <ul className="space-y-2.5">
                                {topServices.map((s: StatEntry) => (
                                    <li key={s.name} className="flex justify-between items-center gap-2">
                                        <span className="text-sm truncate" style={{ color: '#5c3d2e' }}>
                                            {s.name}
                                        </span>
                                        <span className="text-xs whitespace-nowrap shrink-0" style={{ color: '#9e7b6e' }}>
                                            {s.count} uso{s.count !== 1 ? 's' : ''} · ${s.total.toLocaleString('es-CL')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </DashCard>

            </div>
        </DashboardLayout>
    );
}
