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
        PENDING: 'Pendiente',
        CONFIRMED: 'Confirmada',
        COMPLETED: 'Completada',
        CANCELLED: 'Cancelada',
    };
    return map[status] ?? status;
}

function statusClasses(status: AppointmentStatus): string {
    switch (status) {
        case AppointmentStatus.PENDING:
            return 'bg-[#f5c9a0] text-[#8b5e3c] font-semibold';
        case AppointmentStatus.CONFIRMED:
            return 'bg-[#c8e6c9] text-[#2e7d32] font-semibold';
        case AppointmentStatus.COMPLETED:
            return 'bg-[#b2dfdb] text-[#00695c] font-semibold';
        case AppointmentStatus.CANCELLED:
            return 'bg-[#ffcdd2] text-[#c62828] font-semibold';
        default:
            return 'bg-gray-200 text-gray-700 font-semibold';
    }
}

// ─── sub-components ─────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <span className="flex-1 h-px bg-[#d4a89a]" />
            <span className="text-[#8b6f5e] text-lg font-medium tracking-wide whitespace-nowrap">
                {children}
            </span>
            <span className="flex-1 h-px bg-[#d4a89a]" />
        </div>
    );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white rounded-2xl shadow-[0_2px_16px_rgba(180,120,100,0.10)] border border-[#f0e0d8] ${className}`}>
            {children}
        </div>
    );
}

function ActionButton({
    icon,
    label,
    to,
    variant = 'pink',
}: {
    icon: React.ReactNode;
    label: string;
    to: string;
    variant?: 'pink' | 'beige';
}) {
    const base =
        'flex items-center gap-3 px-4 py-3 rounded-xl text-[#5c3d2e] font-medium text-sm transition-all active:scale-95 w-full';
    const colors =
        variant === 'pink'
            ? 'bg-[#f9ddd8] hover:bg-[#f5ccc5]'
            : 'bg-[#f5ede8] hover:bg-[#eeddd6]';

    return (
        <Link to={to} className="flex-1 min-w-[140px]">
            <button className={`${base} ${colors}`}>
                <span className="text-xl leading-none">{icon}</span>
                <span>{label}</span>
            </button>
        </Link>
    );
}

function Spinner() {
    return (
        <div className="w-8 h-8 rounded-full border-4 border-[#c9897a] border-t-transparent animate-spin" />
    );
}

// ─── stat row type ───────────────────────────────────────────────────────────

interface StatEntry {
    name: string;
    count: number;
    total: number;
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
        const weekEnd = endOfWeek(new Date(), { locale: es });
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
            color: 'text-[#5a8f7b]',
        },
        {
            label: 'Completadas',
            count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.COMPLETED).length,
            color: 'text-[#5a8f7b]',
        },
        {
            label: 'Pendientes',
            count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.PENDING).length,
            color: 'text-[#e8a838]',
        },
        {
            label: 'Canceladas',
            count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.CANCELLED).length,
            color: 'text-[#c9897a]',
        },
    ];

    // ── render ─────────────────────────────────────────────────────────────
    return (
        <DashboardLayout>
            <div className="min-h-screen bg-[#fdf6f3] px-4 py-6 space-y-5">

                {/* ── 1. Clientes Activos ─────────────────────────────────── */}
                <Card className="px-6 py-6 text-center">
                    <SectionTitle>Clientes Activos</SectionTitle>
                    {statsLoading ? (
                        <div className="h-16 flex items-center justify-center">
                            <Spinner />
                        </div>
                    ) : (
                        <>
                            <p className="text-7xl font-light text-[#5a8f7b] leading-none mb-2">
                                {customers.length}
                            </p>
                            <p className="text-[#9e7b6e] text-sm">Total registrados</p>
                        </>
                    )}
                </Card>

                {/* ── 2. Acciones Rápidas ─────────────────────────────────── */}
                <Card className="px-5 py-5">
                    <SectionTitle>
                        <Zap size={18} className="inline-block text-[#e8a838] mr-1 -mt-0.5" />
                        Acciones Rápidas
                    </SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                        <ActionButton
                            icon={<CalendarDays size={20} className="text-[#c9897a]" />}
                            label="Nueva Cita"
                            to="/appointments"
                            variant="pink"
                        />
                        <ActionButton
                            icon={<UserPlus size={20} className="text-[#7a9e8e]" />}
                            label="Nuevo Cliente"
                            to="/customers"
                            variant="beige"
                        />
                        <ActionButton
                            icon={<Mail size={20} className="text-[#c9897a]" />}
                            label={`Ver Solicitudes${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`}
                            to="/booking-requests"
                            variant="beige"
                        />
                        <ActionButton
                            icon={<Scissors size={20} className="text-[#c9897a]" />}
                            label="Gestionar Servicios"
                            to="/services"
                            variant="beige"
                        />
                    </div>
                </Card>

                {/* ── 3. Citas de Hoy ─────────────────────────────────────── */}
                <Card className="overflow-hidden">
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                        <div className="flex items-center gap-2">
                            <CalendarDays size={22} className="text-[#c9897a]" />
                            <h2 className="text-[#5c3d2e] font-semibold text-base">Citas de Hoy</h2>
                        </div>
                        <Link
                            to="/appointments"
                            className="text-[#9e7b6e] text-sm underline underline-offset-2 hover:text-[#c9897a] transition-colors"
                        >
                            Ver todas
                        </Link>
                    </div>

                    {appointmentsLoading ? (
                        <div className="flex justify-center py-8">
                            <Spinner />
                        </div>
                    ) : todayAppointments.length === 0 ? (
                        <p className="text-center text-[#b09080] text-sm py-8 px-5">
                            No hay citas programadas para hoy.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-t border-[#f0e0d8]">
                                        <th className="text-left px-5 py-3 text-[#5c3d2e] font-semibold">Hora</th>
                                        <th className="text-left px-3 py-3 text-[#5c3d2e] font-semibold">Cliente</th>
                                        <th className="text-left px-3 py-3 text-[#5c3d2e] font-semibold">Servicio</th>
                                        <th className="text-left px-3 py-3 text-[#5c3d2e] font-semibold">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {todayAppointments.slice(0, 5).map((apt: Appointment, idx: number) => (
                                        <tr
                                            key={apt.id}
                                            onClick={() => navigate('/appointments')}
                                            className={`cursor-pointer transition-colors hover:bg-[#fdf0ec] ${
                                                idx % 2 === 0 ? 'bg-white' : 'bg-[#fdf6f3]'
                                            } border-t border-[#f0e0d8]`}
                                        >
                                            <td className="px-5 py-4 text-[#5c3d2e] whitespace-nowrap">
                                                {apt.appointmentTime || '-'}
                                            </td>
                                            <td className="px-3 py-4 text-[#5c3d2e]">
                                                {apt.customer.fullName}
                                            </td>
                                            <td className="px-3 py-4 text-[#5c3d2e]">
                                                {getAppointmentServices(apt)
                                                    .map((s: ServiceSummary) => s.name)
                                                    .join(' + ') || '-'}
                                            </td>
                                            <td className="px-3 py-4">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs ${statusClasses(apt.status)}`}>
                                                    {statusLabel(apt.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {todayAppointments.length > 5 && (
                                <div className="text-center py-3">
                                    <Link
                                        to="/appointments"
                                        className="text-[#9e7b6e] text-xs underline hover:text-[#c9897a]"
                                    >
                                        Ver {todayAppointments.length - 5} más…
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                {/* ── 4. Resumen Semanal ──────────────────────────────────── */}
                <Card className="px-5 py-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={20} className="text-[#c9897a]" />
                            <h2 className="text-[#5c3d2e] font-semibold text-base">Resumen Semanal</h2>
                        </div>
                        <span className="text-[#5a8f7b] font-bold text-lg">
                            {thisWeekAppointments.length}
                        </span>
                    </div>
                    <div className="space-y-1">
                        {weekStats.map(({ label, count, color }) => (
                            <div
                                key={label}
                                className="flex justify-between items-center py-2 border-b border-[#f0e0d8] last:border-0"
                            >
                                <span className="text-[#9e7b6e] text-sm">{label}</span>
                                <span className={`font-semibold text-sm ${color}`}>{count}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* ── 5. Insights de negocio ──────────────────────────────── */}
                <Card className="px-5 py-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Users size={20} className="text-[#c9897a]" />
                        <h2 className="text-[#5c3d2e] font-semibold text-base">Insights de negocio</h2>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-[#f0e0d8]">
                        <span className="text-[#9e7b6e] text-sm">Valor citas creadas</span>
                        <span className="text-[#5a8f7b] font-bold text-sm">
                            ${totalValue.toLocaleString('es-CL')}
                        </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-[#f0e0d8]">
                        <span className="text-[#9e7b6e] text-sm">Cliente más frecuente</span>
                        <span className="text-[#5c3d2e] font-semibold text-sm text-right max-w-[55%]">
                            {topCustomer ? `${topCustomer.name} (${topCustomer.count})` : 'Sin datos'}
                        </span>
                    </div>

                    <div className="pt-3">
                        <p className="text-[#9e7b6e] text-xs mb-2 uppercase tracking-wide">Top servicios</p>
                        {topServices.length === 0 ? (
                            <p className="text-[#b09080] text-xs">Aún no hay datos de servicios.</p>
                        ) : (
                            <ul className="space-y-2">
                                {topServices.map((s: StatEntry) => (
                                    <li key={s.name} className="flex justify-between items-center">
                                        <span className="text-[#5c3d2e] text-sm">{s.name}</span>
                                        <span className="text-[#9e7b6e] text-xs">
                                            {s.count} uso{s.count !== 1 ? 's' : ''} · ${s.total.toLocaleString('es-CL')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </Card>

            </div>
        </DashboardLayout>
    );
}
