/**
 * CancelAppointmentDialog - Modal para cancelar cita con motivo obligatorio
 * y diferenciación de origen (Clienta vs Manicurista / Salón)
 */

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal, Button } from '@/components/ui';

export type CancelledByOption = 'CUSTOMER' | 'MANICURIST';

export interface CancelAppointmentDialogProps {
  show: boolean;
  appointmentId?: number;
  customerName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  giftCardInfo?: { code: string; servicesText?: string } | null;
  onConfirm: (reason: string, cancelledBy: CancelledByOption, revertGiftCard?: boolean) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const CUSTOMER_REASONS = [
  'Clienta avisó cambio de planes',
  'No se presentó (No-show)',
  'Problema de horario / retraso',
  'Enfermedad de la clienta',
];

const MANICURIST_REASONS = [
  'Emergencia personal / imprevisto',
  'Enfermedad / Licencia médica',
  'Problema operativo en salón',
  'Fuerza mayor',
];

export function CancelAppointmentDialog({
  show,
  customerName = 'Sin nombre',
  appointmentDate = '',
  appointmentTime = '',
  giftCardInfo,
  onConfirm,
  onCancel,
  isLoading = false,
}: CancelAppointmentDialogProps) {
  const [isManicurist, setIsManicurist] = useState(false);
  const [revertGiftCard, setRevertGiftCard] = useState(true);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Debes indicar un motivo para la cancelación');
      return;
    }

    try {
      setError('');
      await onConfirm(reason.trim(), isManicurist ? 'MANICURIST' : 'CUSTOMER', Boolean(giftCardInfo && revertGiftCard));
      setReason('');
      setIsManicurist(false);
      setRevertGiftCard(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar la cita');
    }
  };

  const handleClose = () => {
    setReason('');
    setIsManicurist(false);
    setRevertGiftCard(true);
    setError('');
    onCancel();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="flex items-center gap-2.5">
            <AlertCircle size={22} className="text-rose-600 shrink-0" />
            <span className="text-base font-semibold text-slate-800">
              Cancelar Cita
            </span>
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="space-y-4">
        {/* Appointment Details */}
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs sm:text-sm text-rose-900">
          <div className="font-semibold mb-0.5">{customerName}</div>
          <div className="opacity-90">
            {appointmentDate} a las {appointmentTime}
          </div>
        </div>

        {/* Sección de restitución de GiftCard si la cita fue pagada con GiftCard */}
        {giftCardInfo && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">🎁</span>
              <strong className="text-emerald-800">
                Pago con GiftCard detectado ({giftCardInfo.code})
              </strong>
            </div>
            <div className="text-emerald-700 text-xs mb-2">
              Esta cita utilizó saldo de la GiftCard <strong>{giftCardInfo.code}</strong>
              {giftCardInfo.servicesText ? ` (${giftCardInfo.servicesText})` : ''}.
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                id="revert-giftcard-checkbox"
                checked={revertGiftCard}
                onChange={(e) => setRevertGiftCard(e.target.checked)}
                disabled={isLoading}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold text-xs text-emerald-900">
                Restituir saldo a la GiftCard automáticamente
              </span>
            </label>
            <div className="text-[11px] text-slate-500 mt-1 ml-5">
              {revertGiftCard
                ? '✓ El servicio canjeado volverá a estar disponible en la GiftCard de la clienta al cancelar.'
                : '⚠️ El saldo no se devolverá a la GiftCard (quedará como consumido).'}
            </div>
          </div>
        )}

        {/* Checkbox Origen de Cancelación */}
        <div
          className={`p-3 rounded-xl border transition-colors ${
            isManicurist ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              id="cancel-by-manicurist-checkbox"
              checked={isManicurist}
              onChange={(e) => {
                setIsManicurist(e.target.checked);
                if (error) setError('');
              }}
              disabled={isLoading}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span
              className={`font-semibold text-xs sm:text-sm ${
                isManicurist ? 'text-amber-900' : 'text-slate-700'
              }`}
            >
              Cancelación por parte de la manicurista / salón
            </span>
          </label>
          <div
            className={`text-xs mt-1 ml-5 leading-relaxed ${
              isManicurist ? 'text-amber-800' : 'text-slate-500'
            }`}
          >
            {isManicurist
              ? '⚠️ Cancelación atribuida a la manicurista o al salón. No penalizará el historial ni alertas de la clienta.'
              : 'Cancelación atribuida a la clienta (inconveniente personal, no-show o aviso de inasistencia).'}
          </div>
        </div>

        {/* Chips de motivos frecuentes */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Motivos frecuentes ({isManicurist ? '💅 Manicurista / Salón' : '👤 Clienta'}):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(isManicurist ? MANICURIST_REASONS : CUSTOMER_REASONS).map((quick) => {
              const isSelected = reason === quick;
              return (
                <button
                  key={quick}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setReason(quick);
                    if (error) setError('');
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs transition-all border ${
                    isSelected
                      ? isManicurist
                        ? 'bg-amber-100 border-amber-400 text-amber-900 font-semibold'
                        : 'bg-rose-100 border-rose-400 text-rose-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {quick}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* Reason Field */}
        <div>
          <label htmlFor="cancel-appointment-dialog-motivo-de-cancelacion" className="block font-semibold text-xs text-slate-700 mb-1">
            Motivo de cancelación *
          </label>
          <textarea id="cancel-appointment-dialog-motivo-de-cancelacion"
            rows={3}
            placeholder={
              isManicurist
                ? 'Ej: Emergencia personal, imprevisto de salud, problema operativo...'
                : 'Ej: Clienta avisó cambio de planes, problema de horario, no-show...'
            }
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            disabled={isLoading}
            className={`w-full text-xs sm:text-sm rounded-lg border p-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500 ${
              error ? 'border-rose-500' : 'border-slate-300'
            }`}
          />
          <div className="text-[11px] text-slate-400 mt-1">
            {reason.length} caracteres
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <div className="w-full flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cerrar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? 'Cancelando...' : 'Confirmar Cancelación'}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

export default CancelAppointmentDialog;
