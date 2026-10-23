import React, { useState, useMemo } from 'react';
import { Modal, Button, Badge, Card } from '@/components/ui';
import {
  FiDollarSign,
  FiPrinter,
  FiDownload,
  FiCalendar,
  FiCheckCircle,
  FiTrendingUp,
  FiFileText,
  FiLayers,
  FiCreditCard,
  FiPercent,
  FiClock,
} from 'react-icons/fi';
import { format, subDays, subMonths } from 'date-fns';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { CashClosingPeriodType } from '../../types/cashClosing.types';
import { calculateCashClosing, exportCashClosingToCSV } from '../../utils/cashClosingUtils';

interface CashClosingModalProps {
  show: boolean;
  onHide: () => void;
}

const formatCurrency = (val: number) => `$${val.toLocaleString('es-CL')}`;

export const CashClosingModal: React.FC<CashClosingModalProps> = ({ show, onHide }) => {
  const { appointments } = useAppointmentsStore();

  const [periodType, setPeriodType] = useState<CashClosingPeriodType>('DAILY');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(() => format(new Date(), 'yyyy-MM'));

  // Fecha de referencia según el tipo de período
  const targetDate = useMemo(() => {
    if (periodType === 'DAILY') {
      const [y, m, d] = selectedDateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    } else {
      const [y, m] = selectedMonthStr.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
  }, [periodType, selectedDateStr, selectedMonthStr]);

  // Cálculo en vivo del Cierre de Caja
  const summary = useMemo(() => {
    return calculateCashClosing(appointments, targetDate, periodType);
  }, [appointments, targetDate, periodType]);

  // Accesos rápidos de fecha
  const setQuickToday = () => {
    setPeriodType('DAILY');
    setSelectedDateStr(format(new Date(), 'yyyy-MM-dd'));
  };

  const setQuickYesterday = () => {
    setPeriodType('DAILY');
    setSelectedDateStr(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  };

  const setQuickThisMonth = () => {
    setPeriodType('MONTHLY');
    setSelectedMonthStr(format(new Date(), 'yyyy-MM'));
  };

  const setQuickLastMonth = () => {
    setPeriodType('MONTHLY');
    setSelectedMonthStr(format(subMonths(new Date(), 1), 'yyyy-MM'));
  };

  const handleExportCSV = () => {
    exportCashClosingToCSV(summary);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton className="bg-bunny-creamy/30 border-b border-bunny-accent/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bunny-primary text-white flex items-center justify-center text-xl shadow-xs">
            <FiDollarSign />
          </div>
          <div>
            <Modal.Title>
              <span className="text-bunny-dark text-lg font-bold">
                Cierre de Caja & Finanzas del Salón
              </span>
            </Modal.Title>
            <p className="text-xs text-bunny-text-muted mb-0">
              Resumen contable de atenciones, métodos de pago, costos y boletas
            </p>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4 sm:p-6 space-y-5 bg-bunny-paper/50 max-h-[80vh] overflow-y-auto">
        {/* Barra de Filtros y Tipo de Período */}
        <Card className="border border-bunny-border/80 shadow-xs bg-white">
          <Card.Body className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-5 flex gap-2">
                <Button
                  size="sm"
                  variant={periodType === 'DAILY' ? 'primary' : 'outline'}
                  onClick={() => setPeriodType('DAILY')}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                >
                  <FiCalendar /> Cierre Diario
                </Button>
                <Button
                  size="sm"
                  variant={periodType === 'MONTHLY' ? 'primary' : 'outline'}
                  onClick={() => setPeriodType('MONTHLY')}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                >
                  <FiLayers /> Cierre Mensual
                </Button>
              </div>

              <div className="md:col-span-4">
                {periodType === 'DAILY' ? (
                  <input
                    type="date"
                    value={selectedDateStr}
                    onChange={(e) => setSelectedDateStr(e.target.value)}
                    className="w-full rounded-xl border border-bunny-border px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bunny-mid/50"
                  />
                ) : (
                  <input
                    type="month"
                    value={selectedMonthStr}
                    onChange={(e) => setSelectedMonthStr(e.target.value)}
                    className="w-full rounded-xl border border-bunny-border px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bunny-mid/50"
                  />
                )}
              </div>

              <div className="md:col-span-3 flex gap-1.5 md:justify-end flex-wrap">
                {periodType === 'DAILY' ? (
                  <>
                    <Button size="sm" variant="outline" onClick={setQuickToday} className="py-1 px-2.5 text-xs">
                      Hoy
                    </Button>
                    <Button size="sm" variant="outline" onClick={setQuickYesterday} className="py-1 px-2.5 text-xs">
                      Ayer
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={setQuickThisMonth} className="py-1 px-2.5 text-xs">
                      Este Mes
                    </Button>
                    <Button size="sm" variant="outline" onClick={setQuickLastMonth} className="py-1 px-2.5 text-xs">
                      Mes Anterior
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Encabezado del Período */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h5 className="font-bold text-bunny-text text-base mb-0">
              📊 Informe de {summary.dateFormattedLabel}
            </h5>
            <small className="text-bunny-text-muted text-xs">
              {summary.completedAppointments} cita(s) completada(s) de {summary.totalAppointments} agendada(s)
            </small>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <FiPrinter /> Imprimir / PDF
            </Button>
            <Button
              size="sm"
              variant="success"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <FiDownload /> Exportar Excel (.csv)
            </Button>
          </div>
        </div>

        {/* Tarjetas KPI de Resumen Financiero */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border border-bunny-accent/40 shadow-xs bg-white">
            <Card.Body className="p-3.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-bunny-text-muted font-semibold">INGRESOS TOTALES</span>
                <FiDollarSign className="text-bunny-dark" />
              </div>
              <h4 className="font-bold text-lg sm:text-xl text-bunny-text mb-0">
                {formatCurrency(summary.grossRevenue)}
              </h4>
              <small className="text-emerald-600 font-bold text-xs">
                {summary.completedAppointments} citas pagadas
              </small>
            </Card.Body>
          </Card>

          <Card className="border border-emerald-200 shadow-xs bg-white">
            <Card.Body className="p-3.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-emerald-700 font-semibold">UTILIDAD NETA ESTIMADA</span>
                <FiTrendingUp className="text-emerald-600" />
              </div>
              <h4 className="font-bold text-lg sm:text-xl text-emerald-800 mb-0">
                {formatCurrency(summary.netProfit)}
              </h4>
              <small className="text-bunny-text-muted text-xs">
                Margen Bruto: <strong className="text-bunny-text">{summary.grossMarginPercentage}%</strong>
              </small>
            </Card.Body>
          </Card>

          <Card className="border border-amber-200 shadow-xs bg-white">
            <Card.Body className="p-3.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-amber-700 font-semibold">COSTO DE INSUMOS</span>
                <FiPercent className="text-amber-600" />
              </div>
              <h4 className="font-bold text-lg sm:text-xl text-amber-800 mb-0">
                {formatCurrency(summary.estimatedSuppliesCost)}
              </h4>
              <small className="text-bunny-text-muted text-xs">
                Deducido en recetas
              </small>
            </Card.Body>
          </Card>

          <Card className="border border-sky-200 shadow-xs bg-white">
            <Card.Body className="p-3.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-sky-700 font-semibold">BOLETAS EMITIDAS</span>
                <FiFileText className="text-sky-600" />
              </div>
              <h4 className="font-bold text-lg sm:text-xl text-sky-800 mb-0">
                {summary.invoicesCount}{' '}
                <span className="text-xs font-normal text-bunny-text-muted">
                  / {summary.completedAppointments}
                </span>
              </h4>
              <small className="text-bunny-text-muted text-xs">
                Total: {formatCurrency(summary.invoicesTotalAmount)}
              </small>
            </Card.Body>
          </Card>
        </div>

        {/* Desglose de Métodos de Pago */}
        <Card className="border border-bunny-border/80 shadow-xs bg-white">
          <Card.Header className="py-3 px-4 bg-transparent border-b border-bunny-border flex items-center gap-2">
            <FiCreditCard className="text-bunny-dark" />
            <span className="font-bold text-bunny-text text-sm">
              Desglose por Método de Pago
            </span>
          </Card.Header>
          <Card.Body className="p-4">
            {summary.paymentBreakdown.length === 0 ? (
              <p className="text-bunny-text-muted/70 mb-0 text-xs italic">No hay transacciones registradas en este período.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {summary.paymentBreakdown.map((item) => (
                  <div
                    key={item.methodName}
                    className="p-3 rounded-xl bg-bunny-paper border border-bunny-border/80"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-xs text-bunny-text">
                        {item.methodName}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {item.percentage}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-baseline mt-1">
                      <span className="font-bold text-sm text-bunny-dark">
                        {formatCurrency(item.totalAmount)}
                      </span>
                      <small className="text-bunny-text-muted text-xs">{item.count} cita(s)</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Tabla de Detalle de Citas del Cierre */}
        <Card className="border border-bunny-border/80 shadow-xs bg-white overflow-hidden">
          <Card.Header className="py-3 px-4 bg-transparent border-b border-bunny-border flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FiClock className="text-bunny-dark" />
              <span className="font-bold text-bunny-text text-sm">
                Detalle de Citas Atendidas ({summary.transactions.length})
              </span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-bunny-creamy/50 text-bunny-dark font-medium border border-bunny-accent/40">
              Ticket Promedio: {formatCurrency(summary.averageTicket)}
            </span>
          </Card.Header>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-bunny-paper/80 border-b border-bunny-border text-bunny-text font-bold uppercase tracking-wider">
                  <th className="px-3.5 py-2.5">Hora / Fecha</th>
                  <th className="px-3.5 py-2.5">Clienta</th>
                  <th className="px-3.5 py-2.5">Servicios</th>
                  <th className="px-3.5 py-2.5">Método de Pago</th>
                  <th className="px-3.5 py-2.5 text-center">Boleta</th>
                  <th className="px-3.5 py-2.5 text-right">Insumos ($)</th>
                  <th className="px-3.5 py-2.5 text-right">Valor Cita ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bunny-border">
                {summary.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-bunny-text-muted/70 italic">
                      No hay citas completadas en el período seleccionado.
                    </td>
                  </tr>
                ) : (
                  summary.transactions.map((tx) => (
                    <tr key={tx.appointmentId} className="hover:bg-bunny-paper/60 transition-colors">
                      <td className="px-3.5 py-2.5 font-semibold text-bunny-text whitespace-nowrap">
                        {tx.appointmentTime}
                        {periodType === 'MONTHLY' && (
                          <div className="text-bunny-text-muted/70 text-xs font-normal">{tx.appointmentDate}</div>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-bunny-text">
                          {tx.customerName}
                        </div>
                        {tx.customerRut && (
                          <small className="text-bunny-text-muted/70 text-xs">
                            RUT: {tx.customerRut}
                          </small>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-bunny-text-muted max-w-xs truncate" title={tx.serviceNames.join(' + ')}>
                        {tx.serviceNames.join(' + ')}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <Badge variant="secondary" className="font-medium">
                          {tx.paymentMethod}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        {tx.hasInvoice ? (
                          <Badge variant="success" className="text-xs">
                            <FiCheckCircle className="mr-1 inline" /> SÍ
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs opacity-60">
                            NO
                          </Badge>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-bunny-text-muted">
                        {formatCurrency(tx.estimatedMaterialsCost)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {formatCurrency(tx.totalPrice)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </Modal.Body>

      <Modal.Footer className="border-t border-bunny-border p-4">
        <div className="flex justify-between items-center w-full flex-wrap gap-2">
          <small className="text-bunny-text-muted/70 text-xs">
            BunnyCure POS &copy; {new Date().getFullYear()} &bull; Todos los valores calculados con reglas de negocio oficiales.
          </small>
          <Button variant="outline" onClick={onHide}>
            Cerrar
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};
