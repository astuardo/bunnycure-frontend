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
    const base = 'inline-block rounded-full text-xs font-semibold px-3 py-1';
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

// ─── stat entry type ─────────────────────────────────────────────────────────

interface StatEntry {
    name: string;
    count: number;
    total: number;
}

// ─── sub-components ──────────────────────────────────────────────────────────

/** Decorative centred title with rose hairline dividers */
function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <span className="flex-1 h-px bg-rose-200/70" />
            <span className="text-stone-500 text-base font-medium tracking-wide whitespace-nowrap select-none">
                {children}
            </span>
            <span className="flex-1 h-px bg-rose-200/70" />
        </div>
    );
}

/** Frosted-glass card */
function DashCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`
                bg-white/80 backdrop-blur-sm
                rounded-3xl
                border border-rose-100/50
                shadow-sm
                ${className}
            `}
        >
            {children}
        </div>
    );
}

/** Quick-action button — each with its own pastel colour */
type ActionVariant = 'rose' | 'mint' | 'beige' | 'sky';

const actionColors: Record<ActionVariant, string> = {
    rose:  'bg-rose-100   hover:bg-rose-200/70  text-rose-700',
    mint:  'bg-emerald-50 hover:bg-emerald-100   text-emerald-700',
    beige: 'bg-amber-50   hover:bg-amber-100     text-amber-800',
    sky:   'bg-sky-50     hover:bg-sky-100       text-sky-700',
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
    return (
        <Link to={to}>
            <button
                className={`
                    flex items-center gap-3 w-full
                    px-4 py-3.5 rounded-xl
                    text-sm font-medium
                    transition-all duration-150 active:scale-95
                    ${actionColors[variant]}
                `}
            >
                <span className="shrink-0">{icon}</span>
                <span className="text-left leading-tight">{label}</span>
            </button>
        </Link>
    );
}

/** Inline spinner */
function Spinner() {
    return (
        <div className="w-7 h-7 rounded-full border-[3px] border-rose-300 border-t-rose-500 animate-spin" />
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

    const pendingRequests    = bookingRequests.filter((r: BookingRequest) => r.status === 'PENDING');
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
            pill: 'bg-emerald-100 text-emerald-700',
        },
        {
            label: 'Completadas',
            count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.COMPLETED).length,
            pill: 'bg-teal-100 text-teal-700',
        },
        {
            label: 'Pendientes',
            count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.PENDING).length,
            pill: 'bg-orange-100 text-orange-700',
        },
        {
            label: 'Canceladas',
            count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.CANCELLED).length,
            pill: 'bg-rose-100 text-rose-700',
        },
    ];

    // ── render ─────────────────────────────────────────────────────────────
    return (
        <DashboardLayout>
            {/* ── page shell ── */}
            <div className="min-h-screen bg-rose-50 px-4 py-6 space-y-4 max-w-2xl mx-auto">

                {/* ══ 1. Clientes Activos ══════════════════════════════════ */}
                <DashCard className="px-6 py-7 text-center">
                    <SectionTitle>Clientes Activos</SectionTitle>

                    {statsLoading ? (
                        <div className="flex justify-center py-4"><Spinner /></div>
                    ) : (
                        <>
                            <p className="text-8xl font-extralight text-emerald-600 leading-none tracking-tight mb-1">
                                {customers.length}
                            </p>
                            <p className="text-stone-400 text-sm mt-2">Total registrados</p>
                        </>
                    )}
                </DashCard>

                {/* ══ 2. Acciones Rápidas ══════════════════════════════════ */}
                <DashCard className="px-5 py-6">
                    <SectionTitle>
                        <Zap size={15} className="inline-block text-amber-400 mr-1.5 -mt-px" />
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
                            <CalendarDays size={20} className="text-rose-400" />
                            <h2 className="text-stone-700 font-semibold text-base">Citas de Hoy</h2>
                        </div>
                        <Link
                            to="/appointments"
                            className="text-stone-400 text-sm hover:text-rose-500 transition-colors underline underline-offset-2"
                        >
                            Ver todas
                        </Link>
                    </div>

                    {/* body */}
                    {appointmentsLoading ? (
                        <div className="flex justify-center py-10"><Spinner /></div>
                    ) : todayAppointments.length === 0 ? (
                        <p className="text-center text-stone-400 text-sm py-10 px-5">
                            No hay citas programadas para hoy.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-t border-rose-100/60">
                                        <th className="text-left px-5 py-3 text-stone-600 font-semibold text-xs uppercase tracking-wide">
                                            Hora
                                        </th>
                                        <th className="text-left px-3 py-3 text-stone-600 font-semibold text-xs uppercase tracking-wide">
                                            Cliente
                                        </th>
                                        <th className="text-left px-3 py-3 text-stone-600 font-semibold text-xs uppercase tracking-wide">
                                            Servicio
                                        </th>
                                        <th className="text-left px-3 py-3 text-stone-600 font-semibold text-xs uppercase tracking-wide">
                                            Estado
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {todayAppointments.slice(0, 5).map((apt: Appointment, idx: number) => (
                                        <tr
                                            key={apt.id}
                                            onClick={() => navigate('/appointments')}
                                            className={`
                                                cursor-pointer transition-colors
                                                hover:bg-rose-50/80
                                                border-t border-rose-100/40
                                                ${idx % 2 !== 0 ? 'bg-rose-50/30' : 'bg-white/60'}
                                            `}
                                        >
                                            <td className="px-5 py-4 text-stone-600 whitespace-nowrap font-mono text-xs">
                                                {apt.appointmentTime || '-'}
                                            </td>
                                            <td className="px-3 py-4 text-stone-700 font-medium">
                                                {apt.customer.fullName}
                                            </td>
                                            <td className="px-3 py-4 text-stone-500">
                                                {getAppointmentServices(apt)
                                                    .map((s: ServiceSummary) => s.name)
                                                    .join(' + ') || '-'}
                                            </td>
                                            <td className="px-3 py-4">
                                                <span className={statusPill(apt.status)}>
                                                    {statusLabel(apt.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {todayAppointments.length > 5 && (
                                <div className="text-center py-3 border-t border-rose-100/40">
                                    <Link
                                        to="/appointments"
                                        className="text-stone-400 text-xs hover:text-rose-500 underline underline-offset-2"
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
                    {/* header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={18} className="text-rose-400" />
                            <h2 className="text-stone-700 font-semibold text-base">Resumen Semanal</h2>
                        </div>
                        <span className="text-emerald-600 font-bold text-xl leading-none">
                            {thisWeekAppointments.length}
                        </span>
                    </div>

                    {/* rows */}
                    <div className="space-y-1">
                        {weekStats.map(({ label, count, pill }) => (
                            <div
                                key={label}
                                className="flex justify-between items-center py-2 border-b border-rose-100/50 last:border-0"
                            >
                                <span className="text-stone-500 text-sm">{label}</span>
                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${pill}`}>
                                    {count}
                                </span>
                            </div>
                        ))}
                    </div>
                </DashCard>

                {/* ══ 5. Insights de negocio ═══════════════════════════════ */}
                <DashCard className="px-5 py-5">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={18} className="text-rose-400" />
                        <h2 className="text-stone-700 font-semibold text-base">Insights de negocio</h2>
                    </div>

                    {/* valor total */}
                    <div className="flex justify-between items-center py-2.5 border-b border-rose-100/50">
                        <span className="text-stone-500 text-sm">Valor citas creadas</span>
                        <span className="text-emerald-600 font-bold text-sm">
                            ${totalValue.toLocaleString('es-CL')}
                        </span>
                    </div>

                    {/* top customer */}
                    <div className="flex justify-between items-center py-2.5 border-b border-rose-100/50">
                        <div className="flex items-center gap-1.5">
                            <Users size={14} className="text-stone-400 shrink-0" />
                            <span className="text-stone-500 text-sm">Cliente más frecuente</span>
                        </div>
                        <span className="text-stone-700 font-semibold text-sm text-right max-w-[55%] truncate">
                            {topCustomer ? `${topCustomer.name} (${topCustomer.count})` : 'Sin datos'}
                        </span>
                    </div>

                    {/* top services */}
                    <div className="pt-3">
                        <p className="text-stone-400 text-xs uppercase tracking-widest mb-3">
                            Top servicios
                        </p>
                        {topServices.length === 0 ? (
                            <p className="text-stone-300 text-xs">Aún no hay datos de servicios.</p>
                        ) : (
                            <ul className="space-y-2.5">
                                {topServices.map((s: StatEntry) => (
                                    <li key={s.name} className="flex justify-between items-center gap-2">
                                        <span className="text-stone-600 text-sm truncate">{s.name}</span>
                                        <span className="text-stone-400 text-xs whitespace-nowrap shrink-0">
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
