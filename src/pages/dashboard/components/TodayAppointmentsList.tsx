import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Appointment, AppointmentStatus } from '@/types/appointment.types';
import { TodayOperationalStats } from '@/types/stats.types';
import { ScheduleUnavailability } from '@/types/unavailability.types';
import { ServiceSummary } from '@/types/service.types';
import { getAppointmentTotal } from '@/utils/appointmentUtils';
import { formatRutWithDots } from '@/utils/rutUtils';
import {
    DashCard,
    Spinner,
    DIVIDER,
    TEXT_DARK,
    TEXT_MID,
    formatCurrency,
    getAppointmentServices,
    statusLabel,
    statusPillStyle,
    getWhatsAppUrlForReschedule,
} from './DashboardCommon';

interface TodayAppointmentsListProps {
    todayAppointments: Appointment[];
    todayStats: TodayOperationalStats | null;
    todayUnavailabilities: ScheduleUnavailability[];
    appointmentsLoading: boolean;
    onCompleteAppointment: (appointmentId: number) => void;
    onCancelAppointment: (appointmentId: number) => void;
}

export const TodayAppointmentsList: React.FC<TodayAppointmentsListProps> = ({
    todayAppointments,
    todayStats,
    todayUnavailabilities,
    appointmentsLoading,
    onCompleteAppointment,
    onCancelAppointment,
}) => {
    const navigate = useNavigate();

    const sortedAppointments = useMemo(() => {
        return [...todayAppointments].sort((a, b) => {
            const timeA = a.appointmentTime || '';
            const timeB = b.appointmentTime || '';
            return timeA.localeCompare(timeB);
        });
    }, [todayAppointments]);

    const todayTotalRevenue = todayAppointments
        .filter(apt => apt.status !== 'CANCELLED')
        .reduce((sum, apt) => sum + getAppointmentTotal(apt), 0);

    return (
        <DashCard>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarDays size={20} style={{ color: '#c9897a' }} />
                    <span style={{ fontWeight: 600, fontSize: '15px', color: TEXT_DARK }}>Citas de Hoy</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: TEXT_MID, fontWeight: 700, letterSpacing: '0.05em' }}>Total Hoy</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#5a8f7b' }}>{formatCurrency(todayTotalRevenue)}</span>
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
                            {sortedAppointments.slice(0, 5).map((apt: Appointment, idx: number) => (
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
                                            {apt.status === AppointmentStatus.RESCHEDULE_REQUESTED ? (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/appointments?reschedule=${apt.id}&returnTo=/dashboard`)}
                                                    title="Reagendar esta cita (actualiza fecha y hora del mismo ID)"
                                                    style={{
                                                        border: '1px solid #d9480f',
                                                        background: '#ffe8cc',
                                                        color: '#d9480f',
                                                        borderRadius: '999px',
                                                        padding: '4px 12px',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    🔄 Reagendar
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/appointments?edit=${apt.id}&returnTo=/dashboard`)}
                                                        title="Editar detalles de esta cita (mismo ID)"
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
                                                        onClick={() => navigate(`/appointments?nextAppointment=${apt.id}&returnTo=/dashboard`)}
                                                        title="Agendar una nueva cita futura para esta clienta (mantiene cliente y servicio, crea nuevo ID)"
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
                                                        ➕ Próxima Cita
                                                    </button>
                                                </>
                                            )}
                                            {apt.status !== AppointmentStatus.COMPLETED && (
                                                <button
                                                    type="button"
                                                    onClick={() => onCompleteAppointment(apt.id)}
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
                                                    onClick={() => onCancelAppointment(apt.id)}
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
    );
};
