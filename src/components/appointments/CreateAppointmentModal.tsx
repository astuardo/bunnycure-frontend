import { Button, Badge, Modal, Alert } from '@/components/ui';
import { Appointment } from '../../types/appointment.types';
import { format } from 'date-fns';
import { GiftCard } from '../../types/giftcard.types';
import { AppointmentSchedulePicker } from '../../components/appointments/AppointmentSchedulePicker';
import { ScheduleUnavailability, UnavailabilityColorConfig } from '../../types/unavailability.types';
import type { NavigateFunction } from 'react-router-dom';
import type { Dispatch, SetStateAction } from 'react';
import type { Customer } from '../../types/customer.types';
import type { ServiceCatalog } from '../../types/service.types';
import { AppointmentFormState, CustomChargeItem, CreateStep, formatCurrency } from './appointmentForm.shared';

export interface CreateAppointmentModalProps {
  navigate: NavigateFunction;
  appointments: Appointment[];
  createStep: CreateStep;
  setCreateStep: Dispatch<SetStateAction<CreateStep>>;
  customChargeItems: CustomChargeItem[];
  customerSearch: string;
  setCustomerSearch: Dispatch<SetStateAction<string>>;
  serviceSearch: string;
  setServiceSearch: Dispatch<SetStateAction<string>>;
  summaryServiceSearch: string;
  setSummaryServiceSearch: Dispatch<SetStateAction<string>>;
  isCustomerListCollapsed: boolean;
  setIsCustomerListCollapsed: Dispatch<SetStateAction<boolean>>;
  isServiceListCollapsed: boolean;
  setIsServiceListCollapsed: Dispatch<SetStateAction<boolean>>;
  formData: AppointmentFormState;
  setFormData: Dispatch<SetStateAction<AppointmentFormState>>;
  showCreateAppointmentModal: boolean;
  unavailabilities: ScheduleUnavailability[];
  unavailabilityColors: UnavailabilityColorConfig;
  createUseGiftCardChoice: "YES" | "NO" | null;
  setCreateUseGiftCardChoice: Dispatch<SetStateAction<"YES" | "NO" | null>>;
  setCreateSelectedGiftCardId: Dispatch<SetStateAction<number | null>>;
  createSelectedGiftCardItemIds: number[];
  setCreateSelectedGiftCardItemIds: Dispatch<SetStateAction<number[]>>;
  isCreatingAppointment: boolean;
  filteredCustomers: Customer[];
  filteredServices: ServiceCatalog[];
  filteredSummaryServices: ServiceCatalog[];
  selectedCreateCustomer: Customer | undefined;
  selectedCreateServices: ServiceCatalog[];
  createTotal: number;
  createDuration: number;
  customChargesTotal: number;
  createFinalTotal: number;
  availableCreateCustomerGiftCards: GiftCard[];
  effectiveSelectedGiftCard: GiftCard | null;
  createGiftCardCoverage: number;
  createNetTotalToPay: number;
  handleSelectCreateGiftCardUsage: (choice: "YES" | "NO") => void;
  toggleCreateGiftCardItem: (itemId: number) => void;
  closeCreateModal: () => void;
  handleGoToCreateSummary: (e: React.FormEvent) => void;
  handleConfirmCreateAppointment: () => Promise<void>;
  toggleCreateService: (serviceId: number) => void;
  addCustomChargeItem: () => void;
  updateCustomChargeItem: (id: number, patch: Partial<CustomChargeItem>) => void;
  removeCustomChargeItem: (id: number) => void;
}

/**
 * Modal de nueva cita: formulario (clienta, servicios, fecha y hora) y resumen con cobros y gift card.
 * Extraído de AppointmentsPage con el JSX sin cambios; el estado sigue en la página.
 */
export function CreateAppointmentModal({
  navigate,
  appointments,
  createStep,
  setCreateStep,
  customChargeItems,
  customerSearch,
  setCustomerSearch,
  serviceSearch,
  setServiceSearch,
  summaryServiceSearch,
  setSummaryServiceSearch,
  isCustomerListCollapsed,
  setIsCustomerListCollapsed,
  isServiceListCollapsed,
  setIsServiceListCollapsed,
  formData,
  setFormData,
  showCreateAppointmentModal,
  unavailabilities,
  unavailabilityColors,
  createUseGiftCardChoice,
  setCreateUseGiftCardChoice,
  setCreateSelectedGiftCardId,
  createSelectedGiftCardItemIds,
  setCreateSelectedGiftCardItemIds,
  isCreatingAppointment,
  filteredCustomers,
  filteredServices,
  filteredSummaryServices,
  selectedCreateCustomer,
  selectedCreateServices,
  createTotal,
  createDuration,
  customChargesTotal,
  createFinalTotal,
  availableCreateCustomerGiftCards,
  effectiveSelectedGiftCard,
  createGiftCardCoverage,
  createNetTotalToPay,
  handleSelectCreateGiftCardUsage,
  toggleCreateGiftCardItem,
  closeCreateModal,
  handleGoToCreateSummary,
  handleConfirmCreateAppointment,
  toggleCreateService,
  addCustomChargeItem,
  updateCustomChargeItem,
  removeCustomChargeItem,
}: CreateAppointmentModalProps) {
  return (
    <Modal
      show={showCreateAppointmentModal}
      onHide={closeCreateModal}
      size="xl"
      centered
      className="max-h-[92vh] flex flex-col"
    >
      <Modal.Header closeButton className="bg-bunny-creamy/30 border-b border-bunny-accent/40 shrink-0">
        <Modal.Title>
          <span className="text-bunny-dark font-bold text-lg">
            {createStep === 'form' ? '✨ Nueva Cita' : '📋 Resumen de Nueva Cita'}
          </span>
        </Modal.Title>
      </Modal.Header>
      {createStep === 'form' ? (
        <form onSubmit={handleGoToCreateSummary} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <Modal.Body className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Selector de Cliente */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Cliente <span className="text-rose-500">*</span>
                </label>
                {isCustomerListCollapsed && selectedCreateCustomer ? (
                  <div className="p-3 border border-bunny-accent/40 rounded-xl mb-2 flex justify-between items-center bg-slate-50">
                    <div>
                      <div className="font-semibold text-bunny-dark text-sm">{selectedCreateCustomer.fullName}</div>
                      <small className="text-slate-500 text-xs">{selectedCreateCustomer.phone}</small>
                      {availableCreateCustomerGiftCards.length > 0 && (
                        <div className="mt-1">
                          <Badge variant="success" className="inline-flex items-center gap-1 text-xs">
                            <span>🎁</span>
                            <span>{availableCreateCustomerGiftCards.length} GiftCard activa(s) con saldo</span>
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsCustomerListCollapsed(false);
                        setCreateUseGiftCardChoice(null);
                        setCreateSelectedGiftCardId(null);
                        setCreateSelectedGiftCardItemIds([]);
                      }}
                      className="text-xs"
                    >
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Buscar cliente por nombre o teléfono..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white mb-2"
                    />
                    <div className="border border-slate-200 rounded-xl max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            className={`w-full text-left p-2.5 transition-colors ${
                              formData.customerId === customer.id ? 'bg-bunny-creamy/50 text-bunny-dark font-medium' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, customerId: customer.id }));
                              setIsCustomerListCollapsed(true);
                              setCreateUseGiftCardChoice(null);
                              setCreateSelectedGiftCardId(null);
                              setCreateSelectedGiftCardItemIds([]);
                            }}
                          >
                            <div className="font-semibold text-sm">{customer.fullName}</div>
                            <small className="text-xs text-slate-500">{customer.phone}</small>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-slate-400 text-sm text-center">No se encontraron clientes</div>
                      )}
                    </div>
                    <small className="text-xs text-slate-500 mt-1 block">
                      {selectedCreateCustomer
                        ? `Seleccionado: ${selectedCreateCustomer.fullName}`
                        : 'Selecciona un cliente de la lista'}
                    </small>
                  </>
                )}
              </div>

              {/* Selector de Servicios */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Servicio(s) <span className="text-rose-500">*</span>
                </label>
                {isServiceListCollapsed && selectedCreateServices.length > 0 ? (
                  <div className="p-3 border border-bunny-accent/40 rounded-xl mb-2 flex justify-between items-center bg-slate-50">
                    <div>
                      <div className="font-semibold text-bunny-dark text-sm">
                        {selectedCreateServices.length === 1
                          ? selectedCreateServices[0].name
                          : `${selectedCreateServices.length} servicios (${selectedCreateServices.map((s) => s.name).join(' + ')})`}
                      </div>
                      <small className="text-slate-500 text-xs">{formatCurrency(createTotal)} ({createDuration} min)</small>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsServiceListCollapsed(false)} className="text-xs">
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Buscar servicios..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white mb-2"
                    />
                    <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
                      {filteredServices.length > 0 ? (
                        filteredServices.map((service) => {
                          const isSelected = formData.serviceIds.includes(service.id);
                          return (
                            <button
                              key={service.id}
                              type="button"
                              className={`w-full text-left p-2.5 flex justify-between items-center transition-colors ${
                                isSelected ? 'bg-bunny-creamy/50 text-bunny-dark' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                              onClick={() => {
                                if (!isSelected) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    serviceIds: [...prev.serviceIds, service.id],
                                  }));
                                } else {
                                  toggleCreateService(service.id);
                                }
                                setIsServiceListCollapsed(true);
                              }}
                            >
                              <div>
                                <div className="font-semibold text-sm">{service.name}</div>
                                <small className="text-xs text-slate-500">⏱️ {service.durationMinutes} min</small>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-sm text-slate-800">{formatCurrency(service.price)}</div>
                                {isSelected && <span className="inline-block mt-0.5 text-xs text-bunny-dark font-medium bg-white px-1.5 py-0.5 rounded border border-bunny-accent/40">✓ Seleccionado</span>}
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-3 text-slate-400 text-sm text-center">No se encontraron servicios</div>
                      )}
                    </div>
                    {formData.serviceIds.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full text-xs"
                        onClick={() => setIsServiceListCollapsed(true)}
                      >
                        Cerrar lista de servicios
                      </Button>
                    )}
                    <small className="text-xs text-slate-500 mt-2 block">
                      Seleccionados: {selectedCreateServices.length} | Total: {formatCurrency(createTotal)} | Duración: {createDuration} min
                    </small>
                  </>
                )}
              </div>
            </div>

            <AppointmentSchedulePicker
              selectedDate={formData.appointmentDate}
              selectedTime={formData.appointmentTime}
              durationMinutes={createDuration}
              onDateChange={(date) => setFormData((prev) => ({ ...prev, appointmentDate: date }))}
              onTimeChange={(time) => setFormData((prev) => ({ ...prev, appointmentTime: time }))}
              unavailabilities={unavailabilities}
              unavailabilityColors={unavailabilityColors}
              appointments={appointments}
              minDate={format(new Date(), 'yyyy-MM-dd')}
            />

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Detalle de servicios</label>
              <input
                type="text"
                readOnly
                value={selectedCreateServices.map((service) => service.name).join(' + ') || 'Sin servicios seleccionados'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Notas</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Observaciones, preferencias, etc..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white transition-colors"
              />
            </div>
          </Modal.Body>
          <Modal.Footer className="border-t border-slate-100 flex justify-end gap-2 p-4 shrink-0 bg-white">
            <Button variant="secondary" onClick={closeCreateModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Continuar al resumen &rarr;
            </Button>
          </Modal.Footer>
        </form>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <Modal.Body className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Tarjeta de Resumen Rápido Superior */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-bunny-creamy/50 via-white to-pink-50/40 border border-bunny-accent/60 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-bunny-mid">Cliente</span>
                    <strong className="text-slate-800 text-sm">{selectedCreateCustomer?.fullName || 'Sin cliente'}</strong>
                    {selectedCreateCustomer?.phone && (
                      <span className="text-slate-500 text-xs">({selectedCreateCustomer.phone})</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span>📅 <strong>{formData.appointmentDate}</strong></span>
                    <span>·</span>
                    <span>⏰ <strong>{formData.appointmentTime} hrs</strong></span>
                    <span>·</span>
                    <span>⏱️ {createDuration} min</span>
                    <span>·</span>
                    <span>💅 {selectedCreateServices.length} servicio(s)</span>
                  </div>
                </div>

                <div className="sm:text-right p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total a cobrar en local</div>
                  <div className={`text-lg font-black ${createUseGiftCardChoice === 'YES' && createNetTotalToPay === 0 ? 'text-emerald-700' : 'text-bunny-dark'}`}>
                    {createUseGiftCardChoice === 'YES' && createNetTotalToPay === 0
                      ? '$0 (100% Cubierto)'
                      : formatCurrency(createUseGiftCardChoice === 'YES' ? createNetTotalToPay : createFinalTotal)}
                  </div>
                </div>
              </div>
            </div>

            <Alert variant="info" className="py-2.5 text-xs">
              Revisa el detalle antes de crear la cita. Desde aquí puedes ajustar servicios y agregar cargos extra.
            </Alert>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <h6 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cliente</h6>
                <p className="font-semibold text-slate-800 text-sm mb-0">{selectedCreateCustomer?.fullName || 'Sin cliente'}</p>
                <small className="text-slate-500 text-xs">{selectedCreateCustomer?.phone || '-'}</small>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <h6 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha y hora</h6>
                <p className="font-semibold text-slate-800 text-sm mb-0">
                  {formData.appointmentDate} · {formData.appointmentTime}
                </p>
              </div>
            </div>

            <div>
              <h6 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notas</h6>
              <p className="text-sm text-slate-600 mb-0 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {formData.notes.trim() || 'Sin notas'}
              </p>
            </div>

            {availableCreateCustomerGiftCards.length > 0 && (
              <div className="p-4 border border-bunny-accent/40 rounded-2xl bg-white shadow-xs">
                <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎁</span>
                    <strong className="text-slate-800 text-sm">GiftCard Activa Detectada</strong>
                  </div>
                  <Badge
                    variant={
                      createUseGiftCardChoice === 'YES'
                        ? 'success'
                        : createUseGiftCardChoice === 'NO'
                        ? 'secondary'
                        : 'warning'
                    }
                    className="px-2.5 py-1 text-xs"
                  >
                    {createUseGiftCardChoice === 'YES'
                      ? '✓ Cobro con GiftCard'
                      : createUseGiftCardChoice === 'NO'
                      ? 'Cobro habitual sin GiftCard'
                      : '⚠️ Selección requerida'}
                  </Badge>
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  La clienta tiene <strong>{availableCreateCustomerGiftCards.length} GiftCard(s) activa(s)</strong> con saldo ({availableCreateCustomerGiftCards.map((gc) => gc.code).join(', ')}).
                </p>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-3">
                  <label className="text-xs font-bold text-slate-700 mb-2 block">
                    ¿Deseas utilizar la GiftCard para el cobro de esta cita? <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={createUseGiftCardChoice === 'YES' ? 'success' : 'outline'}
                      onClick={() => handleSelectCreateGiftCardUsage('YES')}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <span>🎁</span>
                      <span>Sí, utilizar GiftCard para cobro</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={createUseGiftCardChoice === 'NO' ? 'secondary' : 'outline'}
                      onClick={() => handleSelectCreateGiftCardUsage('NO')}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <span>💵</span>
                      <span>No utilizar GiftCard (Cobro habitual)</span>
                    </Button>
                  </div>
                </div>

                {createUseGiftCardChoice === 'NO' && (
                  <div className="text-xs text-slate-500 italic px-1">
                    ℹ️ La cita se cobrará habitualmente en el local (efectivo/transferencia). El saldo de la GiftCard no se descontará.
                  </div>
                )}

                {createUseGiftCardChoice === 'YES' && effectiveSelectedGiftCard && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {availableCreateCustomerGiftCards.length > 1 && (
                      <div className="mb-3">
                        <label className="text-xs font-semibold text-slate-700 mb-1 block">GiftCard a utilizar:</label>
                        <select
                          value={effectiveSelectedGiftCard.id}
                          onChange={(e) => {
                            const newId = Number(e.target.value);
                            setCreateSelectedGiftCardId(newId);
                            const newGc = availableCreateCustomerGiftCards.find((g) => g.id === newId);
                            if (newGc) {
                              const matchingItems = newGc.items.filter((item) => {
                                if (item.remainingQuantity <= 0) return false;
                                return selectedCreateServices.some(
                                  (s) =>
                                    s.id === item.serviceId ||
                                    s.name.trim().toLowerCase() === item.serviceName.trim().toLowerCase()
                                );
                              });
                              if (matchingItems.length > 0) {
                                setCreateSelectedGiftCardItemIds(matchingItems.map((i) => i.id));
                              } else {
                                const firstAvail = newGc.items.find((i) => i.remainingQuantity > 0);
                                setCreateSelectedGiftCardItemIds(firstAvail ? [firstAvail.id] : []);
                              }
                            }
                          }}
                          className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bunny-mid/50"
                        >
                          {availableCreateCustomerGiftCards.map((gc) => (
                            <option key={gc.id} value={gc.id}>
                              {gc.code} - Vence: {gc.expiresOn} (
                              {gc.items.filter((i) => i.remainingQuantity > 0).length} servicio(s) con saldo)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-2">
                      <small className="font-semibold text-slate-700 text-xs">
                        Selecciona los servicios de {effectiveSelectedGiftCard.code} a canjear en esta cita:
                      </small>
                      <button
                        type="button"
                        className="text-xs text-bunny-mid hover:underline font-medium"
                        onClick={() =>
                          navigate(`/giftcards?search=${encodeURIComponent(effectiveSelectedGiftCard.code)}`)
                        }
                      >
                        Ver detalle GiftCard ↗
                      </button>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      {effectiveSelectedGiftCard.items
                        .filter((item) => item.remainingQuantity > 0)
                        .map((item) => {
                          const isChecked = createSelectedGiftCardItemIds.includes(item.id);
                          const matchesService = selectedCreateServices.some(
                            (s) =>
                              s.id === item.serviceId ||
                              s.name.trim().toLowerCase() === item.serviceName.trim().toLowerCase()
                          );
                          return (
                            <div
                              key={item.id}
                              className={`p-2.5 rounded-xl border flex justify-between items-center cursor-pointer transition-colors ${
                                isChecked ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                              }`}
                              onClick={() => toggleCreateGiftCardItem(item.id)}
                            >
                              <label className="flex items-center gap-2 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  id={`create-gc-item-${item.id}`}
                                  checked={isChecked}
                                  onChange={() => toggleCreateGiftCardItem(item.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded text-bunny-mid focus:ring-bunny-mid h-4 w-4 border-slate-300"
                                />
                                <div>
                                  <span className="font-semibold text-xs text-slate-800">{item.serviceName}</span>
                                  {matchesService && (
                                    <Badge variant="info" className="ml-2 text-xs">
                                      Coincide con servicio
                                    </Badge>
                                  )}
                                  <div className="text-slate-500 text-xs mt-0.5">
                                    Valor: {formatCurrency(item.unitPrice)} · Disponibles: {item.remainingQuantity}
                                  </div>
                                </div>
                              </label>
                              <span className={`font-bold text-xs ${isChecked ? 'text-emerald-700' : 'text-slate-500'}`}>
                                {isChecked ? `-${formatCurrency(item.unitPrice)}` : formatCurrency(item.unitPrice)}
                              </span>
                            </div>
                          );
                        })}
                    </div>

                    {createGiftCardCoverage > 0 && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex justify-between items-center font-medium">
                        <span>Total cubierto por GiftCard:</span>
                        <strong className="text-emerald-700">-{formatCurrency(createGiftCardCoverage)}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-slate-200 pt-3">
              <h6 className="font-bold text-slate-800 text-sm mb-2">Servicios seleccionados</h6>
              <input
                type="text"
                placeholder="Buscar y ajustar servicios..."
                value={summaryServiceSearch}
                onChange={(e) => setSummaryServiceSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white mb-2"
              />
              <div className="border border-slate-200 rounded-xl p-2.5 mb-2 max-h-48 overflow-y-auto space-y-1.5 bg-white">
                {filteredSummaryServices.length > 0 ? (
                  filteredSummaryServices.map((service) => (
                    <label
                      key={`summary-service-${service.id}`}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <input
                        id={`summary-service-${service.id}`}
                        type="checkbox"
                        checked={formData.serviceIds.includes(service.id)}
                        onChange={() => toggleCreateService(service.id)}
                        className="rounded text-bunny-mid focus:ring-bunny-mid h-4 w-4 border-slate-300"
                      />
                      <span className="text-slate-700 font-medium">
                        {service.name} - {formatCurrency(service.price)} ({service.durationMinutes} min)
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="text-slate-400 text-xs text-center py-2">No se encontraron servicios</div>
                )}
              </div>
              <div className="text-xs text-slate-500 mb-3">
                Subtotal servicios: <strong className="text-slate-800">{formatCurrency(createTotal)}</strong> · Duración estimada: <strong className="text-slate-800">{createDuration} min</strong>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h6 className="font-bold text-slate-800 text-sm mb-0">Cargos extra personalizados</h6>
                  <small className="text-slate-500 text-xs">
                    Agrega ítems como cristalería, decoración u otros cobros adicionales.
                  </small>
                </div>
                <Button size="sm" variant="outline" onClick={addCustomChargeItem} className="text-xs">
                  + Agregar ítem
                </Button>
              </div>

              {customChargeItems.length === 0 ? (
                <p className="text-slate-400 text-xs italic mb-3">No hay cargos extra agregados.</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {customChargeItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-7">
                        <input
                          type="text"
                          placeholder="Descripción (ej: Cristalería)"
                          value={item.description}
                          onChange={(e) =>
                            updateCustomChargeItem(item.id, { description: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bunny-mid/50"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={item.amount}
                          onChange={(e) =>
                            updateCustomChargeItem(item.id, {
                              amount: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bunny-mid/50"
                        />
                      </div>
                      <div className="col-span-2">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => removeCustomChargeItem(item.id)}
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

            <div className="border-t border-slate-200 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal servicios</span>
                <strong className="text-slate-800">{formatCurrency(createTotal)}</strong>
              </div>
              {createUseGiftCardChoice === 'YES' && createGiftCardCoverage > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>🎁 Cobertura GiftCard ({effectiveSelectedGiftCard?.code})</span>
                  <strong>-{formatCurrency(createGiftCardCoverage)}</strong>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Total extras</span>
                <strong className="text-slate-800">{formatCurrency(customChargesTotal)}</strong>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200 text-slate-900">
                <span>Total final a cobrar en local</span>
                <span className={createUseGiftCardChoice === 'YES' && createNetTotalToPay === 0 ? 'text-emerald-700' : 'text-bunny-dark'}>
                  {createUseGiftCardChoice === 'YES' && createNetTotalToPay === 0
                    ? '$0 (100% Cubierto con GiftCard)'
                    : formatCurrency(createUseGiftCardChoice === 'YES' ? createNetTotalToPay : createFinalTotal)}
                </span>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-t border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 p-4 shrink-0 bg-white">
            <Button
              variant="outline"
              onClick={() => setCreateStep('form')}
              disabled={isCreatingAppointment}
              className="text-xs sm:text-sm font-medium"
            >
              &larr; Volver a editar
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={closeCreateModal}
                disabled={isCreatingAppointment}
                className="text-xs sm:text-sm"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmCreateAppointment}
                disabled={formData.serviceIds.length === 0 || isCreatingAppointment}
                className="text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5"
              >
                {isCreatingAppointment ? (
                  'Creando cita...'
                ) : (
                  <>
                    <span>✨ Crear cita</span>
                    <span className="opacity-90 font-normal text-xs">
                      ({createUseGiftCardChoice === 'YES' && createNetTotalToPay === 0
                        ? '$0'
                        : formatCurrency(createUseGiftCardChoice === 'YES' ? createNetTotalToPay : createFinalTotal)})
                    </span>
                  </>
                )}
              </Button>
            </div>
          </Modal.Footer>
        </div>
      )}
    </Modal>
  );
}
