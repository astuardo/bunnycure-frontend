import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { FaWhatsapp, FaBell, FaEnvelope, FaHistory } from 'react-icons/fa';
import { Badge, Button, Card } from '@/components/ui';
import { Appointment, AppointmentStatus } from '../../types/appointment.types';
import { getAppointmentServices, getAppointmentTotal } from '../../utils/appointmentUtils';

const formatCurrency = (value: number) => `$${value.toLocaleString('es-CL')}`;

export interface AppointmentsListProps {
  appointments: Appointment[];
  onEdit: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
  onScheduleNext: (appointment: Appointment) => void;
  onChangeStatus: (id: number, status: AppointmentStatus) => void;
  onCancel: (id: number) => void;
  onDelete: (id: number) => void;
  onSendNotification: (id: number) => void;
  onSendWhatsAppConfirmation: (id: number) => void;
  onSendWhatsAppReminder: (id: number) => void;
  onWhatsAppHandoff: (id: number) => void;
  onShowMessageHistory: (appointment: Appointment) => void;
}

/**
 * Listado de citas: tabla en escritorio y tarjetas en móvil, con las acciones de cada cita.
 * Extraído de AppointmentsPage; el marcado es el mismo (ver e2e/appointments-list.spec.ts).
 */
export function AppointmentsList({
  appointments: displayedAppointments,
  onEdit: openEditModal,
  onReschedule: openRescheduleModal,
  onScheduleNext: openNextAppointmentModal,
  onChangeStatus: handleChangeStatus,
  onCancel: handleCancelAppointment,
  onDelete: handleDeleteAppointment,
  onSendNotification: handleSendNotification,
  onSendWhatsAppConfirmation: handleSendWhatsAppConfirmation,
  onSendWhatsAppReminder: handleSendWhatsAppReminder,
  onWhatsAppHandoff: handleWhatsAppHandoff,
  onShowMessageHistory: setSelectedNotificationsApt,
}: AppointmentsListProps) {
  const [openDropdownAptId, setOpenDropdownAptId] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownAptId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, 'warning' | 'primary' | 'success' | 'secondary'> = {
      PENDING: 'warning',
      CONFIRMED: 'primary',
      COMPLETED: 'success',
      CANCELLED: 'secondary',
      RESCHEDULE_REQUESTED: 'warning',
    };
    const labels: Record<AppointmentStatus, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      RESCHEDULE_REQUESTED: '🔄 Reprogramar',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <>
      {/* Vista Desktop: Tabla */}
      <div className="hidden md:block overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <th className="px-3.5 py-3">Fecha</th>
                <th className="px-3.5 py-3">Hora</th>
                <th className="px-3.5 py-3">Cliente</th>
                <th className="px-3.5 py-3">Servicio(s)</th>
                <th className="px-3.5 py-3">Valor</th>
                <th className="px-3.5 py-3">Estado</th>
                <th className="px-3.5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedAppointments.map((apt) => {
                const appointmentServices = getAppointmentServices(apt);
                return (
                  <tr key={apt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-3.5 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {format(parseISO(apt.appointmentDate), 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-3.5 py-3 font-semibold text-slate-700 whitespace-nowrap">
                      {apt.appointmentTime.slice(0, 5)}
                    </td>
                    <td className="px-3.5 py-3 text-slate-800 font-medium">
                      {apt.customer.fullName}
                    </td>
                    <td className="px-3.5 py-3 text-slate-600 max-w-xs truncate" title={appointmentServices.map((s) => s.name).join(' + ')}>
                      {appointmentServices.map((service) => service.name).join(' + ')}
                    </td>
                    <td className="px-3.5 py-3 font-bold text-emerald-700 whitespace-nowrap">
                      {formatCurrency(getAppointmentTotal(apt))}
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {getStatusBadge(apt.status)}
                    </td>
                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                        {apt.status === AppointmentStatus.RESCHEDULE_REQUESTED ? (
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() => openRescheduleModal(apt)}
                            title="Reagendar esta cita con nueva fecha y hora (mismo ID)"
                            className="text-xs py-1 px-2.5"
                          >
                            🔄 Reagendar
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(apt)}
                              title="Editar detalles de esta cita (mismo ID)"
                              className="text-xs py-1 px-2.5"
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openNextAppointmentModal(apt)}
                              title="Agendar próxima cita futura para esta clienta (mantiene cliente y servicios, crea nuevo ID)"
                              className="text-xs py-1 px-2.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            >
                              ➕ Próxima
                            </Button>
                          </>
                        )}
                        {apt.status === AppointmentStatus.PENDING && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleChangeStatus(apt.id, AppointmentStatus.CONFIRMED)}
                            className="text-xs py-1 px-2.5"
                          >
                            Confirmar
                          </Button>
                        )}
                        {apt.status === AppointmentStatus.CONFIRMED && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleChangeStatus(apt.id, AppointmentStatus.COMPLETED)}
                            className="text-xs py-1 px-2.5"
                          >
                            Completar
                          </Button>
                        )}
                        {apt.status === AppointmentStatus.RESCHEDULE_REQUESTED && (
                          <a
                            href={`https://wa.me/${apt.customer.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${apt.customer.fullName}! Te escribimos de BunnyCure respecto a tu solicitud para reprogramar tu cita del ${format(parseISO(apt.appointmentDate), 'dd/MM/yyyy', { locale: es })}.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Contactar por WhatsApp"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            <FaWhatsapp className="text-emerald-600" /> Contactar
                          </a>
                        )}
                        {apt.status !== AppointmentStatus.CANCELLED && apt.status !== AppointmentStatus.COMPLETED && (
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() => handleCancelAppointment(apt.id)}
                            title="Cancelar cita solicitando motivo"
                            className="text-xs py-1 px-2.5"
                          >
                            Cancelar
                          </Button>
                        )}

                        {/* Dropdown de comunicación */}
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs text-xs font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownAptId(openDropdownAptId === apt.id ? null : apt.id);
                            }}
                            title="Opciones de mensajería"
                          >
                            📩
                          </button>
                          {openDropdownAptId === apt.id && (
                            <div 
                              className="absolute right-0 mt-1 w-52 rounded-xl bg-white shadow-xl border border-slate-200 py-1 z-50 text-xs text-left"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                onClick={() => {
                                  setOpenDropdownAptId(null);
                                  handleSendNotification(apt.id);
                                }}
                              >
                                <FaBell className="text-amber-500" /> Enviar Notificación
                              </button>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                onClick={() => {
                                  setOpenDropdownAptId(null);
                                  handleSendWhatsAppConfirmation(apt.id);
                                }}
                              >
                                <FaWhatsapp className="text-emerald-500" /> Confirmar por WhatsApp
                              </button>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                onClick={() => {
                                  setOpenDropdownAptId(null);
                                  handleSendWhatsAppReminder(apt.id);
                                }}
                              >
                                <FaEnvelope className="text-sky-500" /> Recordatorio WhatsApp
                              </button>
                              <div className="border-t border-slate-100 my-1"></div>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                onClick={() => {
                                  setOpenDropdownAptId(null);
                                  setSelectedNotificationsApt(apt);
                                }}
                              >
                                <FaHistory className="text-sky-600" /> Historial de Mensajes
                              </button>
                              <div className="border-t border-slate-100 my-1"></div>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                onClick={() => {
                                  setOpenDropdownAptId(null);
                                  handleWhatsAppHandoff(apt.id);
                                }}
                              >
                                <FaWhatsapp className="text-emerald-500" /> Traspaso a Humano
                              </button>
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteAppointment(apt.id)}
                          className="text-xs py-1 px-2.5"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vista Móvil: Cards */}
      <div className="md:hidden space-y-3">
        {displayedAppointments.map((apt) => {
          const appointmentServices = getAppointmentServices(apt);
          return (
            <Card key={apt.id} className="border border-slate-200 shadow-xs bg-white">
              <Card.Body className="p-4">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-slate-400 text-xs mb-0.5 truncate">
                      {format(parseISO(apt.appointmentDate), 'EEEE d MMMM', { locale: es })}
                    </div>
                    <h6 className="font-bold text-bunny-dark text-sm truncate">
                      {apt.appointmentTime.slice(0, 5)} · {apt.customer.fullName}
                    </h6>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(apt.status)}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-600 text-xs truncate flex-1">
                      {appointmentServices.map((service) => service.name).join(' + ')}
                    </span>
                    <span className="font-bold text-emerald-700 text-xs flex-shrink-0">
                      {formatCurrency(getAppointmentTotal(apt))}
                    </span>
                  </div>
                  {apt.notes && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-600 italic border border-slate-100">
                      {apt.notes}
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {apt.status === AppointmentStatus.RESCHEDULE_REQUESTED ? (
                    <Button size="sm" variant="warning" className="flex-1 text-xs" onClick={() => openRescheduleModal(apt)} title="Reagendar esta cita (mismo ID)">
                      🔄 Reagendar
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => openEditModal(apt)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs text-emerald-700 border-emerald-300" onClick={() => openNextAppointmentModal(apt)} title="Agendar próxima cita futura (nuevo ID)">
                        ➕ Próxima
                      </Button>
                    </>
                  )}
                  {apt.status === AppointmentStatus.PENDING && (
                    <Button size="sm" variant="success" className="flex-1 text-xs" onClick={() => handleChangeStatus(apt.id, AppointmentStatus.CONFIRMED)}>
                      Confirmar
                    </Button>
                  )}
                  {apt.status === AppointmentStatus.CONFIRMED && (
                    <Button size="sm" variant="primary" className="flex-1 text-xs" onClick={() => handleChangeStatus(apt.id, AppointmentStatus.COMPLETED)}>
                      Completar
                    </Button>
                  )}
                  {apt.status === AppointmentStatus.RESCHEDULE_REQUESTED && (
                    <a
                      href={`https://wa.me/${apt.customer.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${apt.customer.fullName}! Te escribimos de BunnyCure respecto a tu solicitud para reprogramar tu cita del ${format(parseISO(apt.appointmentDate), 'dd/MM/yyyy', { locale: es })}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-200"
                    >
                      <FaWhatsapp /> Contactar
                    </a>
                  )}
                  {apt.status !== AppointmentStatus.CANCELLED && apt.status !== AppointmentStatus.COMPLETED && (
                    <Button size="sm" variant="warning" className="text-xs" onClick={() => handleCancelAppointment(apt.id)}>
                      Cancelar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="text-xs px-2.5" onClick={() => setSelectedNotificationsApt(apt)} title="Historial de Mensajes">
                    <FaHistory className="text-sky-600" />
                  </Button>
                  <Button size="sm" variant="danger" className="text-xs px-2.5" onClick={() => handleDeleteAppointment(apt.id)}>
                    Eliminar
                  </Button>
                </div>
              </Card.Body>
            </Card>
          );
        })}
      </div>
    </>
  );
}
