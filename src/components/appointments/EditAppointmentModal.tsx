import { Button, Badge, Modal } from '@/components/ui';
import { AppointmentStatus, Appointment } from '../../types/appointment.types';
import { GiftCard, GiftCardItem } from '../../types/giftcard.types';
import { AppointmentSchedulePicker } from '../../components/appointments/AppointmentSchedulePicker';
import { ScheduleUnavailability, UnavailabilityColorConfig } from '../../types/unavailability.types';
import type { Dispatch, SetStateAction } from 'react';
import type { Customer } from '../../types/customer.types';
import type { ServiceCatalog } from '../../types/service.types';
import { CustomChargeItem, formatCurrency, AppointmentEditFormState, EditMode } from './appointmentForm.shared';

export interface EditAppointmentModalProps {
  appointments: Appointment[];
  applyingGiftCard: boolean;
  gcCodeInput: string;
  setGcCodeInput: Dispatch<SetStateAction<string>>;
  bindingGcLoading: boolean;
  showEditModal: boolean;
  editMode: EditMode;
  editCustomChargeItems: CustomChargeItem[];
  setEditCustomChargeItems: Dispatch<SetStateAction<CustomChargeItem[]>>;
  nextEditCustomChargeId: number;
  setNextEditCustomChargeId: Dispatch<SetStateAction<number>>;
  editingAppointmentId: number | null;
  editCustomerSearch: string;
  setEditCustomerSearch: Dispatch<SetStateAction<string>>;
  editServiceSearch: string;
  setEditServiceSearch: Dispatch<SetStateAction<string>>;
  editFormData: AppointmentEditFormState;
  setEditFormData: Dispatch<SetStateAction<AppointmentEditFormState>>;
  unavailabilities: ScheduleUnavailability[];
  unavailabilityColors: UnavailabilityColorConfig;
  filteredEditCustomers: Customer[];
  filteredEditServices: ServiceCatalog[];
  selectedEditCustomer: Customer | undefined;
  selectedEditServices: ServiceCatalog[];
  editTotal: number;
  editDuration: number;
  availableEditCustomerGiftCards: GiftCard[];
  handleApplyGiftCardToEditAppointment: (gc: GiftCard, item: GiftCardItem) => Promise<void>;
  handleBindGiftCardCodeToEditCustomer: () => Promise<void>;
  closeEditModal: () => void;
  handleEditAppointment: (e: React.FormEvent) => Promise<void>;
  toggleEditService: (serviceId: number) => void;
}

/**
 * Modal de edición / reagendamiento de una cita existente, con gift cards y cargos adicionales.
 * Extraído de AppointmentsPage con el JSX sin cambios; el estado sigue en la página.
 */
export function EditAppointmentModal({
  appointments,
  applyingGiftCard,
  gcCodeInput,
  setGcCodeInput,
  bindingGcLoading,
  showEditModal,
  editMode,
  editCustomChargeItems,
  setEditCustomChargeItems,
  nextEditCustomChargeId,
  setNextEditCustomChargeId,
  editingAppointmentId,
  editCustomerSearch,
  setEditCustomerSearch,
  editServiceSearch,
  setEditServiceSearch,
  editFormData,
  setEditFormData,
  unavailabilities,
  unavailabilityColors,
  filteredEditCustomers,
  filteredEditServices,
  selectedEditCustomer,
  selectedEditServices,
  editTotal,
  editDuration,
  availableEditCustomerGiftCards,
  handleApplyGiftCardToEditAppointment,
  handleBindGiftCardCodeToEditCustomer,
  closeEditModal,
  handleEditAppointment,
  toggleEditService,
}: EditAppointmentModalProps) {
  return (
    <Modal
      show={showEditModal}
      onHide={closeEditModal}
      size="lg"
      centered
    >
      <Modal.Header closeButton className="bg-bunny-creamy/30 border-b border-bunny-accent/40">
        <Modal.Title>
          <span className="text-bunny-dark font-bold text-lg">
            {editMode === 'reschedule' ? `🔄 Reagendar Cita #${editingAppointmentId}` : `✏️ Editar Cita #${editingAppointmentId}`}
          </span>
        </Modal.Title>
      </Modal.Header>
      <form onSubmit={handleEditAppointment}>
        <Modal.Body className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-appointment-cliente" className="text-xs font-bold text-bunny-text mb-1.5 block">
                Cliente <span className="text-rose-500">*</span>
              </label>
              {editMode === 'reschedule' ? (
                <div className="p-3 border border-bunny-border rounded-xl bg-bunny-paper">
                  <div className="font-semibold text-bunny-text text-sm">{selectedEditCustomer?.fullName || 'Cliente no disponible'}</div>
                  <small className="text-bunny-text-muted text-xs">{selectedEditCustomer?.phone || '-'}</small>
                </div>
              ) : (
                <>
                  <input id="edit-appointment-cliente"
                    type="text"
                    placeholder="Buscar cliente por nombre o teléfono..."
                    value={editCustomerSearch}
                    onChange={(e) => setEditCustomerSearch(e.target.value)}
                    className="w-full rounded-xl border border-bunny-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white mb-2"
                  />
                  <div className="border border-bunny-border rounded-xl max-h-52 overflow-y-auto divide-y divide-bunny-border bg-white">
                    {filteredEditCustomers.length > 0 ? (
                      filteredEditCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className={`w-full text-left p-2.5 transition-colors ${
                            editFormData.customerId === customer.id ? 'bg-bunny-creamy/50 text-bunny-dark font-medium' : 'hover:bg-bunny-paper text-bunny-text'
                          }`}
                          onClick={() => setEditFormData((prev) => ({ ...prev, customerId: customer.id }))}
                        >
                          <div className="font-semibold text-sm">{customer.fullName}</div>
                          <small className="text-xs text-bunny-text-muted">{customer.phone}</small>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-bunny-text-muted/70 text-sm text-center">No se encontraron clientes</div>
                    )}
                  </div>
                  <small className="text-xs text-bunny-text-muted mt-1 block">
                    {selectedEditCustomer
                      ? `Seleccionado: ${selectedEditCustomer.fullName}`
                      : 'Selecciona un cliente de la lista'}
                  </small>
                </>
              )}
            </div>

            <div>
              <label htmlFor="edit-appointment-servicio-s" className="text-xs font-bold text-bunny-text mb-1.5 block">
                Servicio(s) <span className="text-rose-500">*</span>
              </label>
              <input id="edit-appointment-servicio-s"
                type="text"
                placeholder="Buscar servicios..."
                value={editServiceSearch}
                onChange={(e) => setEditServiceSearch(e.target.value)}
                className="w-full rounded-xl border border-bunny-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white mb-2"
              />
              <div className="border border-bunny-border rounded-xl p-2.5 max-h-52 overflow-y-auto space-y-1.5 bg-white">
                {filteredEditServices.length > 0 ? (
                  filteredEditServices.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-bunny-paper cursor-pointer text-xs"
                    >
                      <input
                        id={`edit-service-${service.id}`}
                        type="checkbox"
                        checked={editFormData.serviceIds.includes(service.id)}
                        onChange={() => toggleEditService(service.id)}
                        className="rounded text-bunny-mid focus:ring-bunny-mid h-4 w-4 border-bunny-border-strong"
                      />
                      <span className="text-bunny-text font-medium">
                        {service.name} - {formatCurrency(service.price)} ({service.durationMinutes} min)
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="text-bunny-text-muted/70 text-xs text-center py-2">No se encontraron servicios</div>
                )}
              </div>
              <small className="text-xs text-bunny-text-muted mt-1 block">
                Seleccionados: {selectedEditServices.length} | Total: {formatCurrency(editTotal)} | Duración: {editDuration} min
              </small>
            </div>
          </div>

          <AppointmentSchedulePicker
            selectedDate={editFormData.appointmentDate}
            selectedTime={editFormData.appointmentTime}
            durationMinutes={editDuration}
            onDateChange={(date) => setEditFormData((prev) => ({ ...prev, appointmentDate: date }))}
            onTimeChange={(time) => setEditFormData((prev) => ({ ...prev, appointmentTime: time }))}
            unavailabilities={unavailabilities}
            unavailabilityColors={unavailabilityColors}
            appointments={appointments.filter((a) => a.id !== editingAppointmentId)}
            allowPastDates={editMode === 'edit'}
          />

          {editMode === 'edit' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label htmlFor="edit-appointment-estado" className="text-xs font-bold text-bunny-text mb-1.5 block">Estado</label>
                <select id="edit-appointment-estado"
                  value={editFormData.status}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, status: e.target.value as AppointmentStatus }))}
                  className="w-full rounded-xl border border-bunny-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white"
                >
                  <option value={AppointmentStatus.PENDING}>⏳ Pendiente</option>
                  <option value={AppointmentStatus.CONFIRMED}>✅ Confirmada</option>
                  <option value={AppointmentStatus.RESCHEDULE_REQUESTED}>🔄 Reprogramar</option>
                  <option value={AppointmentStatus.COMPLETED}>🎉 Completada</option>
                  <option value={AppointmentStatus.CANCELLED}>❌ Cancelada</option>
                </select>
              </div>
              <div className="text-xs text-bunny-text-muted md:pt-5">
                Valor estimado: <strong className="text-bunny-text">{formatCurrency(editTotal)} CLP</strong>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs">
              🔄 Reagendando cita <strong>#{editingAppointmentId}</strong> de <strong>{selectedEditCustomer?.fullName}</strong>. Selecciona la nueva fecha y hora. La cita mantendrá su ID y pasará a estado <strong>Confirmada</strong>.
            </div>
          )}

          <div>
            <label htmlFor="edit-appointment-detalle-de-servicios" className="text-xs font-bold text-bunny-text mb-1.5 block">Detalle de servicios</label>
            <input id="edit-appointment-detalle-de-servicios"
              type="text"
              readOnly
              value={selectedEditServices.map((service) => service.name).join(' + ') || 'Sin servicios seleccionados'}
              className="w-full bg-bunny-paper border border-bunny-border rounded-xl px-3 py-2 text-sm text-bunny-text font-medium"
            />
          </div>

          <div>
            <label htmlFor="edit-appointment-precio-final-clp" className="text-xs font-bold text-bunny-text mb-1.5 block">Precio Final (CLP)</label>
            <input id="edit-appointment-precio-final-clp"
              type="number"
              min={0}
              step={100}
              value={editFormData.totalPrice || 0}
              onChange={(e) => setEditFormData((prev) => ({ ...prev, totalPrice: Number(e.target.value) }))}
              className="w-full rounded-xl border border-bunny-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white"
            />
            <small className="text-xs text-bunny-text-muted mt-1 block">
              Valor calculado según servicios: {formatCurrency(editTotal)}
            </small>
          </div>

          <div>
            <label htmlFor="edit-appointment-notas" className="text-xs font-bold text-bunny-text mb-1.5 block">Notas</label>
            <textarea id="edit-appointment-notas"
              rows={3}
              value={editFormData.notes}
              onChange={(e) => setEditFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Observaciones, preferencias, etc..."
              className="w-full rounded-xl border border-bunny-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white transition-colors"
            />
          </div>

          <div className="p-4 border border-bunny-accent/40 rounded-2xl bg-white shadow-xs">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold text-sm text-bunny-dark">🎁 Canje de GiftCards para esta Cita</div>
              {availableEditCustomerGiftCards.length > 0 && (
                <Badge variant="success" className="text-xs">
                  {availableEditCustomerGiftCards.length} disponible{availableEditCustomerGiftCards.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {availableEditCustomerGiftCards.length > 0 ? (
              <>
                <p className="text-bunny-text-muted text-xs mb-2">
                  Servicios disponibles de la clienta. Haz clic en el botón para canjear 1 servicio hacia esta cita:
                </p>
                <div className="space-y-2 mb-3">
                  {availableEditCustomerGiftCards.map((gc) => (
                    <div key={gc.id} className="p-3 border border-bunny-border rounded-xl bg-bunny-paper">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-semibold text-xs text-bunny-text">{gc.code}</span>
                        <small className="text-bunny-text-muted text-xs">Vence: {gc.expiresOn}</small>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {gc.items.filter((item) => item.remainingQuantity > 0).map((item) => (
                          <Button
                            key={item.id}
                            size="sm"
                            variant="outline"
                            disabled={applyingGiftCard}
                            onClick={() => handleApplyGiftCardToEditAppointment(gc, item)}
                            className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 py-1"
                          >
                            ⚡ Canjear {item.serviceName} ({item.remainingQuantity} disp.)
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-bunny-text-muted/70 text-xs mb-2 italic">
                La clienta no tiene GiftCards vinculadas activas con saldo.
              </p>
            )}

            {/* Input para vincular GiftCard al portador o código */}
            <div className="pt-3 border-t border-bunny-border mt-2">
              <small className="text-bunny-text-muted font-semibold block mb-1 text-xs">
                ¿La clienta presenta una GiftCard al portador o código de tarjeta?
              </small>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: GC-2026-000123"
                  value={gcCodeInput}
                  onChange={(e) => setGcCodeInput(e.target.value)}
                  className="flex-1 rounded-xl border border-bunny-border px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bunny-mid/50"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bindingGcLoading || !gcCodeInput.trim()}
                  onClick={handleBindGiftCardCodeToEditCustomer}
                  className="text-xs"
                >
                  {bindingGcLoading ? 'Buscando...' : 'Vincular y Mostrar'}
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-bunny-border pt-3">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h6 className="font-bold text-bunny-text text-sm mb-0">Cargos extra personalizados</h6>
                <small className="text-bunny-text-muted text-xs">Gestión de ítems adicionales para esta cita.</small>
              </div>
              <Button size="sm" variant="outline" onClick={() => {
                setEditCustomChargeItems(prev => [...prev, { id: nextEditCustomChargeId, description: '', amount: 0 }]);
                setNextEditCustomChargeId(prev => prev + 1);
              }} className="text-xs">
                + Agregar ítem
              </Button>
            </div>

            {editCustomChargeItems.length > 0 && (
              <div className="space-y-2 mb-3">
                {editCustomChargeItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-7">
                      <input
                        type="text"
                        placeholder="Descripción (ej: Cristalería)"
                        value={item.description}
                        onChange={(e) => setEditCustomChargeItems(prev => prev.map(i => i.id === item.id ? { ...i, description: e.target.value } : i))}
                        className="w-full rounded-xl border border-bunny-border px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bunny-mid/50"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={item.amount}
                        onChange={(e) => setEditCustomChargeItems(prev => prev.map(i => i.id === item.id ? { ...i, amount: Number(e.target.value) || 0 } : i))}
                        className="w-full rounded-xl border border-bunny-border px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bunny-mid/50"
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setEditCustomChargeItems(prev => prev.filter(i => i.id !== item.id))}
                        className="w-full text-xs py-1"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-bunny-border pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-bunny-text-muted">
              <span>Subtotal servicios</span>
              <strong className="text-bunny-text">{formatCurrency(editTotal)}</strong>
            </div>
            <div className="flex justify-between text-bunny-text-muted">
              <span>Total extras</span>
              <strong className="text-bunny-text">{formatCurrency(editCustomChargeItems.reduce((s, i) => s + i.amount, 0))}</strong>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-bunny-border text-bunny-text">
              <span>Total final estimado</span>
              <span className="text-bunny-dark">{formatCurrency(editTotal + editCustomChargeItems.reduce((s, i) => s + i.amount, 0))}</span>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-t border-bunny-border flex justify-end gap-2 p-4">
          <Button variant="secondary" onClick={closeEditModal}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit">
            {editMode === 'reschedule' ? 'Guardar Reagendado' : 'Guardar Cambios'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
