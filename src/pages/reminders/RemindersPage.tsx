/**
 * Página de Gestión de Recordatorios
 * Dashboard para ver y enviar recordatorios de citas (Automatizado + Contingencia Manual WhatsApp)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FaBell, FaClock, FaCheckCircle, FaPaperPlane, FaWhatsapp } from 'react-icons/fa';
import { FiSearch, FiRefreshCw, FiCalendar } from 'react-icons/fi';
import DashboardLayout from '../../components/common/DashboardLayout';
import { RANGE_PAGE_SIZE, useAppointmentsStore } from '../../stores/appointmentsStore';
import { remindersApi, type ReminderStats } from '../../api/reminders.api';
import { appointmentsApi } from '../../api/appointments.api';
import { useToast } from '../../hooks/useToast';
import { addDays, format, isToday, isTomorrow, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Appointment, AppointmentStatus } from '../../types/appointment.types';
import { matchRutSearch } from '../../utils/rutUtils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

const statusBadgeVariant: Record<AppointmentStatus, 'primary' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  CONFIRMED: 'primary',
  PENDING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  RESCHEDULE_REQUESTED: 'warning',
};

const statusLabels: Record<AppointmentStatus, string> = {
  CONFIRMED: 'Confirmada',
  PENDING: 'Pendiente',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  RESCHEDULE_REQUESTED: 'Reprogramar',
};

const getAppointmentServiceLabel = (apt: Appointment) => {
  const services = apt.services && apt.services.length > 0 ? apt.services : [apt.service];
  return services.map((service) => service.name).join(' + ');
};

type ReminderTab = 'TODAY' | 'TOMORROW' | 'UPCOMING' | 'ALL_PENDING';

export default function RemindersPage() {
  const toast = useToast();
  const { appointments, isLoading, fetchAppointments } = useAppointmentsStore();
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [sendingIds, setSendingIds] = useState<Set<number>>(new Set());

  const [activeTab, setActiveTab] = useState<ReminderTab>('TODAY');
  const [searchQuery, setSearchQuery] = useState('');

  const loadStats = useCallback(async () => {
    try {
      const data = await remindersApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Recordatorios: citas de hoy en adelante (un año), no solo las 50 más recientes
  const loadData = useCallback(async () => {
    const today = new Date();
    await fetchAppointments({
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(addDays(today, 365), 'yyyy-MM-dd'),
      size: RANGE_PAGE_SIZE,
    });
    await loadStats();
  }, [fetchAppointments, loadStats]);

  useEffect(() => {
    void (async () => {
      await loadData();
    })();
  }, [loadData]);

  // Citas activas futuras o de hoy
  const allActiveAppointments = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return appointments.filter((apt) => {
      const isActiveStatus = apt.status === 'PENDING' || apt.status === 'CONFIRMED';
      if (!isActiveStatus) return false;
      try {
        const aptDate = parseISO(apt.appointmentDate);
        return isValid(aptDate) && aptDate >= todayStart;
      } catch {
        return false;
      }
    }).sort((a, b) => {
      const dateCompare = new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.appointmentTime.localeCompare(b.appointmentTime);
    });
  }, [appointments]);

  // Citas pendientes de recordatorio
  const pendingReminders = useMemo(() => {
    return allActiveAppointments.filter((apt) => !apt.reminderSent);
  }, [allActiveAppointments]);

  // Citas de Hoy
  const todayAppointments = useMemo(() => {
    return allActiveAppointments.filter((apt) => {
      try {
        return isToday(parseISO(apt.appointmentDate));
      } catch {
        return false;
      }
    });
  }, [allActiveAppointments]);

  // Citas de Mañana
  const tomorrowAppointments = useMemo(() => {
    return allActiveAppointments.filter((apt) => {
      try {
        return isTomorrow(parseISO(apt.appointmentDate));
      } catch {
        return false;
      }
    });
  }, [allActiveAppointments]);

  // Citas según la pestaña seleccionada
  const tabAppointments = useMemo(() => {
    let list: Appointment[] = [];
    switch (activeTab) {
      case 'TODAY':
        list = todayAppointments;
        break;
      case 'TOMORROW':
        list = tomorrowAppointments;
        break;
      case 'UPCOMING':
        list = allActiveAppointments;
        break;
      case 'ALL_PENDING':
      default:
        list = pendingReminders;
        break;
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.trim().toLowerCase();
    return list.filter((apt) => {
      const customerMatch = (apt.customer?.fullName || '').toLowerCase().includes(q);
      const phoneMatch = (apt.customer?.phone || '').includes(q);
      const rutMatch = apt.customer?.rut ? matchRutSearch(apt.customer.rut, q) : false;
      const serviceMatch = getAppointmentServiceLabel(apt).toLowerCase().includes(q);
      return customerMatch || phoneMatch || rutMatch || serviceMatch;
    });
  }, [activeTab, todayAppointments, tomorrowAppointments, allActiveAppointments, pendingReminders, searchQuery]);

  const handleSendBulk = async () => {
    setSendingBulk(true);
    try {
      await remindersApi.sendTodayReminders();
      toast.success('✅ Recordatorios automáticos de hoy enviados exitosamente');
      await loadData();
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      toast.error('❌ Error al enviar recordatorios masivos');
    } finally {
      setSendingBulk(false);
    }
  };

  const handleSendSingleBackend = async (appointmentId: number) => {
    setSendingIds((prev) => new Set(prev).add(appointmentId));
    try {
      const response = await remindersApi.sendReminderForAppointment(appointmentId);
      if (response.success) {
        toast.success(response.message);
        await loadData();
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      // Intento con endpoint alternativo si falla el admin
      try {
        await appointmentsApi.sendWhatsAppReminder(appointmentId);
        toast.success('✅ Recordatorio enviado exitosamente');
        await loadData();
      } catch {
        toast.error('❌ No se pudo enviar el recordatorio automático');
      }
    } finally {
      setSendingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(appointmentId);
        return newSet;
      });
    }
  };

  const handleSendManualWhatsApp = (apt: Appointment) => {
    if (!apt.customer?.phone) {
      toast.error('La clienta no tiene teléfono registrado');
      return;
    }

    const cleanPhone = apt.customer.phone.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.startsWith('56') ? cleanPhone : `56${cleanPhone}`;
    const serviceName = getAppointmentServiceLabel(apt);
    const dateFormatted = formatAppointmentDateTime(apt);

    const message =
      `¡Hola ${apt.customer.fullName}! 🐰💅 Te recordamos tu cita de manicure agendada para el *${dateFormatted}* (${serviceName}) en *BunnyCure*.\n\n` +
      `Por favor confírmanos tu asistencia respondiendo a este mensaje. ✨\n` +
      `¡Te esperamos con mucho cariño! 💕`;

    const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.info(`Abriendo WhatsApp para ${apt.customer.fullName}`);
  };

  const formatAppointmentDateTime = (apt: Appointment) => {
    try {
      const date = format(parseISO(apt.appointmentDate), "EEEE d 'de' MMMM", { locale: es });
      return `${date} - ${apt.appointmentTime} hrs`;
    } catch {
      return `${apt.appointmentDate} - ${apt.appointmentTime} hrs`;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Encabezado y Acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-bunny-cocoa flex items-center gap-2">
              <FaBell className="text-rose-600" />
              Gestión de Recordatorios
            </h2>
            <p className="text-sm text-bunny-text-muted">
              Notifica a tus clientas de forma automática o mediante WhatsApp directo en 1-clic
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData()}
              disabled={isLoading || loadingStats}
              leftIcon={<FiRefreshCw className={isLoading ? 'animate-spin' : ''} />}
            >
              Actualizar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSendBulk}
              disabled={sendingBulk || todayAppointments.filter((a) => !a.reminderSent).length === 0}
              isLoading={sendingBulk}
              leftIcon={!sendingBulk ? <FaPaperPlane /> : undefined}
            >
              Enviar Automático (Citas de Hoy)
            </Button>
          </div>
        </div>

        {/* Tarjetas KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-bunny-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
              <FaClock />
            </div>
            <div>
              <div className="text-xs font-semibold text-bunny-text-muted">Pendientes Hoy</div>
              <h3 className="text-2xl font-bold text-bunny-cocoa">
                {todayAppointments.filter((a) => !a.reminderSent).length}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-bunny-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-xl shrink-0">
              <FiCalendar />
            </div>
            <div>
              <div className="text-xs font-semibold text-bunny-text-muted">Citas Mañana</div>
              <h3 className="text-2xl font-bold text-bunny-cocoa">
                {tomorrowAppointments.length}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-bunny-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
              <FaCheckCircle />
            </div>
            <div>
              <div className="text-xs font-semibold text-bunny-text-muted">Enviados Hoy (Backend)</div>
              <h3 className="text-2xl font-bold text-emerald-700">
                {loadingStats ? <Spinner size="sm" /> : stats?.sentToday ?? todayAppointments.filter((a) => a.reminderSent).length}
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-bunny-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center text-xl shrink-0">
              <FaBell />
            </div>
            <div>
              <div className="text-xs font-semibold text-bunny-text-muted">Total Próximas</div>
              <h3 className="text-2xl font-bold text-rose-900">
                {allActiveAppointments.length}
              </h3>
            </div>
          </div>
        </div>

        {/* Pestañas Rápidas y Buscador */}
        <div className="p-4 rounded-2xl bg-white border border-bunny-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('TODAY')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'TODAY'
                  ? 'bg-rose-900 text-white shadow-sm'
                  : 'bg-bunny-paper text-bunny-text-muted border border-bunny-border hover:bg-bunny-sand'
              }`}
            >
              📅 Citas de Hoy ({todayAppointments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TOMORROW')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'TOMORROW'
                  ? 'bg-rose-900 text-white shadow-sm'
                  : 'bg-bunny-paper text-bunny-text-muted border border-bunny-border hover:bg-bunny-sand'
              }`}
            >
              🌅 Citas de Mañana ({tomorrowAppointments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ALL_PENDING')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'ALL_PENDING'
                  ? 'bg-rose-900 text-white shadow-sm'
                  : 'bg-bunny-paper text-bunny-text-muted border border-bunny-border hover:bg-bunny-sand'
              }`}
            >
              ⏳ Todas las Pendientes ({pendingReminders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('UPCOMING')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'UPCOMING'
                  ? 'bg-rose-900 text-white shadow-sm'
                  : 'bg-bunny-paper text-bunny-text-muted border border-bunny-border hover:bg-bunny-sand'
              }`}
            >
              🗓️ Todas ({allActiveAppointments.length})
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Buscar por clienta, RUT, teléfono o servicio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 bg-white"
            />
            <FiSearch className="absolute text-bunny-text-muted/70 top-2.5 left-3 text-sm" />
          </div>
        </div>

        {/* Tabla de Citas */}
        <div className="rounded-2xl bg-white border border-bunny-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-bunny-border">
            <h5 className="font-bold text-bunny-cocoa text-base">
              Listado de Citas ({tabAppointments.length})
            </h5>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <Spinner size="lg" variant="primary" />
              <p className="text-bunny-text-muted/70 mt-2 text-xs">Cargando citas...</p>
            </div>
          ) : tabAppointments.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <FaCheckCircle className="text-emerald-500/50 mx-auto text-4xl" />
              <h6 className="font-bold text-bunny-cocoa">No hay citas en este filtro</h6>
              <p className="text-bunny-text-muted/70 text-xs">
                Todas las clientas de esta sección están al día o no tienen citas agendadas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-rose-50/50 border-b border-bunny-border text-xs font-semibold text-bunny-text-muted uppercase tracking-wider">
                    <th className="py-3 px-5">Fecha y Hora</th>
                    <th className="py-3 px-5">Clienta</th>
                    <th className="py-3 px-5">Servicio</th>
                    <th className="py-3 px-5">Estado Cita</th>
                    <th className="py-3 px-5">Recordatorio</th>
                    <th className="py-3 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50 text-bunny-text">
                  {tabAppointments.map((apt) => {
                    const isPending = !apt.reminderSent;
                    return (
                      <tr key={apt.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-bunny-cocoa text-sm">
                            {apt.appointmentTime} hrs
                          </div>
                          <div className="text-xs text-bunny-text-muted/70">
                            {formatAppointmentDateTime(apt)}
                          </div>
                        </td>

                        <td className="py-3.5 px-5">
                          <div className="font-semibold text-bunny-cocoa text-sm">
                            {apt.customer?.fullName || 'Clienta'}
                          </div>
                          <div className="text-xs text-bunny-text-muted/70">
                            {apt.customer?.phone || 'Sin teléfono'} {apt.customer?.rut ? `• ${apt.customer.rut}` : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-sm">
                          {getAppointmentServiceLabel(apt)}
                        </td>

                        <td className="py-3.5 px-5">
                          <Badge variant={statusBadgeVariant[apt.status] || 'neutral'}>
                            {statusLabels[apt.status] || apt.status}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-5">
                          {apt.reminderSent ? (
                            <Badge variant="success">
                              <FaCheckCircle className="inline mr-1" /> Enviado
                            </Badge>
                          ) : (
                            <Badge variant="warning">
                              <FaClock className="inline mr-1" /> Pendiente
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Botón 1: Automático Backend */}
                            <Button
                              variant={isPending ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handleSendSingleBackend(apt.id)}
                              disabled={sendingIds.has(apt.id)}
                              title="Enviar recordatorio automático vía Backend"
                              isLoading={sendingIds.has(apt.id)}
                              leftIcon={!sendingIds.has(apt.id) ? <FaPaperPlane /> : undefined}
                            >
                              Auto
                            </Button>

                            {/* Botón 2: Contingencia Manual WhatsApp */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendManualWhatsApp(apt)}
                              title="Abrir chat de WhatsApp con recordatorio pre-cargado"
                              leftIcon={<FaWhatsapp className="text-emerald-600" />}
                              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            >
                              WhatsApp
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
      </div>
    </DashboardLayout>
  );
}
