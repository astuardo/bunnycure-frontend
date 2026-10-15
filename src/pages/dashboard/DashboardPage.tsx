import { useEffect, useMemo, useState } from 'react';
import {
    isToday,
    startOfWeek,
    endOfWeek,
    parseISO,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    isSameMonth,
} from 'date-fns';
import DashboardLayout from '@/components/common/DashboardLayout';
import { CancelAppointmentDialog, CancelledByOption } from '@/components/appointments/CancelAppointmentDialog';
import { CompleteAppointmentWithSuppliesModal } from '@/components/appointments/CompleteAppointmentWithSuppliesModal';
import { CashClosingModal } from '@/components/finances/CashClosingModal';
import SalonOnboardingWizardModal from '@/components/onboarding/SalonOnboardingWizardModal';
import { useAppointmentsStore } from '@/stores/appointmentsStore';
import { useCustomersStore } from '@/stores/customersStore';
import { useGiftCardsStore } from '@/stores/giftcardsStore';
import { Appointment, AppointmentStatus } from '@/types/appointment.types';
import { GiftCardRedeemItemRequest } from '@/types/giftcard.types';
import { extractAppointmentGiftCardInfo } from '@/utils/appointmentUtils';
import { statsApi } from '../../api/stats.api';
import { DashboardStats, TodayOperationalStats } from '@/types/stats.types';
import {
    settingsApi,
    loadCachedUnavailabilities,
    loadCachedUnavailabilityColors,
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
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/hooks/useAuth';
import { isSalonAdmin } from '@/types/user.types';

// Subcomponents modularizados
import { PAGE_BG, getAppointmentServices } from './components/DashboardCommon';
import { OnboardingBanner } from './components/OnboardingBanner';
import { DashboardMetricsGrid } from './components/DashboardMetricsGrid';
import { QuickActionsGrid } from './components/QuickActionsGrid';
import { PendingBookingsWidget } from './components/PendingBookingsWidget';
import { WhatsAppManagerWidget } from './components/WhatsAppManagerWidget';
import { TodayAppointmentsList } from './components/TodayAppointmentsList';
import { MonthCalendarPreview, MonthCalendarCell } from './components/MonthCalendarPreview';

export default function DashboardPage() {
    const toast = useToast();
    const { tenant } = useTenant();
    const { user } = useAuth();
    const userRole = user?.role ? user.role.replace('ROLE_', '').toUpperCase() : 'SPECIALIST';
    const canAdmin = isSalonAdmin(userRole);

    const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);
    const onboardingStorageKey = `bunny_onboarding_completed_${tenant?.slug || 'mi-salon'}`;
    const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        return localStorage.getItem(onboardingStorageKey) === 'true';
    });

    const handleDismissAndKeepConfig = () => {
        localStorage.setItem(onboardingStorageKey, 'true');
        setIsOnboardingCompleted(true);
        toast.success('Configuración actual del salón mantenida. Puedes relanzar el Asistente en cualquier momento desde Acciones Rápidas.');
    };

    const { appointments, isLoading: appointmentsLoading, fetchAppointments, updateAppointmentStatus, updateAppointment } = useAppointmentsStore();
    const { customers, fetchCustomers } = useCustomersStore();
    const { giftCards, fetchGiftCards, revertGiftCardRedeem } = useGiftCardsStore();

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

    const handleCancelAppointment = (id: number) => {
        setCancelingAppointmentId(id);
        setShowCancelModal(true);
    };

    const handleConfirmCancelAppointment = async (
        reason: string,
        cancelledBy: CancelledByOption = 'CUSTOMER',
        revertGiftCard: boolean = false
    ) => {
        if (!cancelingAppointmentId) return;

        setIsCancelLoading(true);
        try {
            const appointment = appointments.find((apt) => apt.id === cancelingAppointmentId);
            if (!appointment) throw new Error('Cita no encontrada');

            let giftCardRestored = false;
            const gcInfo = extractAppointmentGiftCardInfo(appointment.notes);

            if (revertGiftCard && gcInfo) {
                try {
                    let currentGiftCards = giftCards;
                    if (!currentGiftCards || currentGiftCards.length === 0) {
                        await fetchGiftCards();
                        currentGiftCards = useGiftCardsStore.getState().giftCards;
                    }

                    const targetGc = currentGiftCards.find(
                        (gc) => gc.code.toUpperCase() === gcInfo.code.toUpperCase()
                    );

                    if (targetGc) {
                        const aptServices = getAppointmentServices(appointment).map((s) => s.name.trim().toLowerCase());
                        const itemsToRevert: GiftCardRedeemItemRequest[] = [];

                        for (const item of targetGc.items) {
                            const matchesText =
                                gcInfo.servicesText && gcInfo.servicesText.toLowerCase().includes(item.serviceName.trim().toLowerCase());
                            const matchesApt = aptServices.includes(item.serviceName.trim().toLowerCase());

                            if ((matchesText || matchesApt) && item.redeemedQuantity > 0) {
                                itemsToRevert.push({ giftCardItemId: item.id, quantity: 1 });
                            }
                        }

                        if (itemsToRevert.length === 0) {
                            const singleRedeemed = targetGc.items.find((i) => i.redeemedQuantity > 0);
                            if (singleRedeemed) {
                                itemsToRevert.push({ giftCardItemId: singleRedeemed.id, quantity: 1 });
                            }
                        }

                        if (itemsToRevert.length > 0) {
                            await revertGiftCardRedeem(targetGc.id, {
                                note: `Restitución automática por cancelación de cita #${appointment.id} (${appointment.appointmentDate}). Motivo: ${reason}`,
                                items: itemsToRevert,
                            });
                            await fetchGiftCards();
                            giftCardRestored = true;
                        }
                    }
                } catch (gcErr) {
                    console.error('Error al revertir saldo de GiftCard en cancelación:', gcErr);
                }
            }

            const initiatorLabel = cancelledBy === 'MANICURIST' ? 'Manicurista' : 'Cliente';
            const gcNotice = giftCardRestored
                ? `\nSaldo GiftCard ${gcInfo?.code}: Restituido exitosamente a la clienta.`
                : '';
            const cancellationBlock = `--- CANCELACIÓN ---\nCancelado por: ${initiatorLabel}\nMotivo: ${reason}${gcNotice}`;

            const updatedNotes = appointment.notes
                ? `${appointment.notes}\n\n${cancellationBlock}`
                : cancellationBlock;

            await updateAppointmentStatus(cancelingAppointmentId, AppointmentStatus.CANCELLED, { notes: updatedNotes });
            await updateAppointment(cancelingAppointmentId, { notes: updatedNotes });

            trackAppointmentCancelled(cancelingAppointmentId, appointment.customer.id, reason, cancelledBy.toLowerCase());

            if (giftCardRestored) {
                toast.success('Cita cancelada correctamente y saldo de GiftCard restituido a la clienta');
            } else {
                toast.success(cancelledBy === 'MANICURIST' ? 'Cita cancelada (por manicurista)' : 'Cita cancelada correctamente');
            }

            setShowCancelModal(false);
            setCancelingAppointmentId(null);
            await fetchAppointments();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al cancelar la cita');
        } finally {
            setIsCancelLoading(false);
        }
    };

    const todayAppointments = useMemo(() => {
        return appointments.filter(
            (apt: Appointment) => apt.appointmentDate && isToday(parseISO(apt.appointmentDate))
        );
    }, [appointments]);

    const todayUnavailabilities = useMemo(() => {
        return getTodayUnavailabilities(unavailabilities);
    }, [unavailabilities]);

    const thisWeekAppointments = useMemo(() => {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
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
        { label: 'Pendientes', count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.PENDING).length, bg: '#fde8cc', color: '#7c4a00' },
        { label: 'Reprogramar', count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.RESCHEDULE_REQUESTED).length, bg: '#ffe8cc', color: '#d9480f' },
        { label: 'Canceladas', count: thisWeekAppointments.filter((a: Appointment) => a.status === AppointmentStatus.CANCELLED).length, bg: '#fce4e4', color: '#7c1c1c' },
    ], [thisWeekAppointments]);

    const monthCalendarCells: MonthCalendarCell[] = useMemo(() => {
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

    return (
        <DashboardLayout>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            <div className="bunny-page" style={{ minHeight: '100vh', background: PAGE_BG, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* 1. Banner Onboarding */}
                <OnboardingBanner
                    canAdmin={canAdmin}
                    isOnboardingCompleted={isOnboardingCompleted}
                    tenantName={tenant?.name}
                    onStartOnboarding={() => setShowOnboardingModal(true)}
                    onDismissAndKeepConfig={handleDismissAndKeepConfig}
                />

                {/* 2. Acciones Rápidas */}
                <QuickActionsGrid
                    canAdmin={canAdmin}
                    onOpenOnboarding={() => setShowOnboardingModal(true)}
                />

                {/* 3. Solicitudes de Reprogramación */}
                <PendingBookingsWidget
                    rescheduleRequestedAppointments={rescheduleRequestedAppointments}
                />

                {/* 4. Gestión de WhatsApp */}
                <WhatsAppManagerWidget />

                {/* 5. Agenda del Día: Citas de Hoy */}
                <TodayAppointmentsList
                    todayAppointments={todayAppointments}
                    todayStats={todayStats}
                    todayUnavailabilities={todayUnavailabilities}
                    appointmentsLoading={appointmentsLoading}
                    onCompleteAppointment={(aptId) => setCompleteDialog({ show: true, appointmentId: aptId })}
                    onCancelAppointment={handleCancelAppointment}
                />

                {/* 6. Métricas: Clientes Activos, Resumen Semanal e Insights */}
                <DashboardMetricsGrid
                    statsLoading={statsLoading}
                    customerCount={customers.length}
                    thisWeekAppointmentsCount={thisWeekAppointments.length}
                    weekStats={weekStats}
                    dashboardStats={dashboardStats}
                />

                {/* 7. Calendario del Mes */}
                <MonthCalendarPreview
                    calendarMonth={calendarMonth}
                    calendarDisplayConfig={calendarDisplayConfig}
                    unavailabilityColors={unavailabilityColors}
                    monthCalendarCells={monthCalendarCells}
                />
            </div>

            {/* Modales operacionales */}
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
                    giftCardInfo={extractAppointmentGiftCardInfo(
                        appointments.find((apt) => apt.id === cancelingAppointmentId)?.notes
                    )}
                    onConfirm={handleConfirmCancelAppointment}
                    onCancel={() => {
                        setShowCancelModal(false);
                        setCancelingAppointmentId(null);
                    }}
                    isLoading={isCancelLoading}
                />
            )}

            <CashClosingModal
                show={showCashClosingModal}
                onHide={() => setShowCashClosingModal(false)}
            />

            <SalonOnboardingWizardModal
                isOpen={showOnboardingModal}
                onClose={() => setShowOnboardingModal(false)}
                onCompleted={async () => {
                    setIsOnboardingCompleted(true);
                    await fetchAppointments();
                    await fetchCustomers();
                }}
            />
        </DashboardLayout>
    );
}
