import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaWhatsapp, FaEye, FaCheckCircle, FaSearch, FaTimes, FaBirthdayCake } from 'react-icons/fa';
import { FiClock, FiGift, FiRefreshCw } from 'react-icons/fi';
import { Customer } from '../../types/customer.types';
import { BirthdayCustomer } from '../../types/birthday.types';
import {
  computeBirthdayCustomers,
  recordBirthdayGreeting,
  clearBirthdayGreeting,
  buildBirthdayGreetingMessage,
  buildBirthdayWhatsAppUrl,
} from '../../utils/birthdayUtils';
import { Button, Badge, Card, Spinner } from '@/components/ui';
import { BirthdayMessageModal } from './BirthdayMessageModal';
import { useToast } from '../../hooks/useToast';
import { matchRutSearch } from '../../utils/rutUtils';

interface CustomerBirthdaysTabProps {
  customers: Customer[];
  loading?: boolean;
}

const MONTHS = [
  { value: 0, label: '📅 Todos los meses' },
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

export const CustomerBirthdaysTab: React.FC<CustomerBirthdaysTabProps> = ({ customers, loading = false }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const currentMonthNumber = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNumber);
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'TODAY' | 'NEXT_7_DAYS' | 'THIS_MONTH'>('THIS_MONTH');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState<BirthdayCustomer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Computar todas las cumpleañeras
  const { birthdayCustomers, metrics } = useMemo(() => {
    void refreshTrigger;
    return computeBirthdayCustomers(customers);
  }, [customers, refreshTrigger]);

  // Filtrado reactivo según mes, filtro rápido y buscador
  const filteredCustomers = useMemo(() => {
    return birthdayCustomers.filter((bc) => {
      // 1. Filtro por Mes
      if (selectedMonth > 0 && bc.birthMonthNumber !== selectedMonth) {
        return false;
      }

      // 2. Filtro Rápido
      if (quickFilter === 'TODAY' && !bc.isToday) return false;
      if (quickFilter === 'NEXT_7_DAYS' && !bc.isNext7Days) return false;
      if (quickFilter === 'THIS_MONTH' && !bc.isThisMonth) return false;

      // 3. Buscador de Texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (bc.customer.fullName || '').toLowerCase();
        const phone = (bc.customer.phone || '').toLowerCase();
        const rutMatches = matchRutSearch(q, (bc.customer as any).rut);
        return name.includes(q) || rutMatches || phone.includes(q);
      }

      return true;
    });
  }, [birthdayCustomers, selectedMonth, quickFilter, searchQuery]);

  const handleOpenModal = (bc: BirthdayCustomer) => {
    setSelectedCustomerForModal(bc);
    setShowModal(true);
  };

  const handleDirectWhatsApp = (bc: BirthdayCustomer) => {
    if (!bc.customer.phone) {
      toast.error('La clienta no tiene un teléfono registrado');
      return;
    }
    const name = bc.customer.fullName || 'Clienta';
    const message = buildBirthdayGreetingMessage(name, 'DISCOUNT');
    const url = buildBirthdayWhatsAppUrl(bc.customer.phone, message);

    recordBirthdayGreeting(bc.customer.id);
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success(`🎂 Saludo de cumpleaños enviado a ${name}`);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleResetGreeting = (bc: BirthdayCustomer) => {
    clearBirthdayGreeting(bc.customer.id);
    toast.info(`Estado de saludo restablecido para ${bc.customer.fullName}`);
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Spinner size="lg" className="border-bunny-primary mx-auto" />
        <p className="mt-3 text-bunny-text-muted text-sm">Cargando clientas y fechas de cumpleaños...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner de Campaña Masiva Meta WhatsApp para Cumpleaños */}
      <Card className="border border-amber-200 bg-gradient-to-r from-amber-50/80 via-white to-orange-50/50 shadow-sm">
        <Card.Body className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="warning" className="text-[11px] font-bold">
                🎂 CAMPAÑA OFICIAL WHATSAPP
              </Badge>
              <span className="font-bold text-bunny-dark text-sm sm:text-base">
                ¿Quieres saludar a todas las cumpleañeras del mes en 1 solo clic?
              </span>
            </div>
            <p className="text-bunny-text-muted text-xs sm:text-sm mb-0 max-w-2xl">
              Usa la plantilla oficial de Meta con botón de reserva para enviar un saludo con descuento a todas las clientas que cumplen este mes.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/marketing?template=saludo_cumpleanos_bunnycure&audience=BIRTHDAYS_THIS_MONTH')}
            className="bg-orange-600 hover:bg-orange-700 text-white whitespace-nowrap text-xs sm:text-sm font-semibold"
          >
            📣 Ver Campaña de Cumpleaños &rarr;
          </Button>
        </Card.Body>
      </Card>

      {/* ══ 1. Tarjetas KPI Resumen de Cumpleaños ══════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-bunny-accent/40 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-bunny-dark/80 font-semibold uppercase tracking-wider">CUMPLE ESTE MES</span>
            <FaBirthdayCake className="text-bunny-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-bunny-dark mb-0.5">
            {metrics.totalThisMonth}
          </div>
          <small className="text-bunny-text-muted/70 text-[11px]">
            {MONTHS.find((m) => m.value === currentMonthNumber)?.label}
          </small>
        </div>

        <div
          className={`p-3.5 rounded-xl border shadow-sm transition-all ${
            metrics.totalToday > 0
              ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-300'
              : 'bg-white border-bunny-border'
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-rose-600 font-bold uppercase tracking-wider">¡CUMPLEN HOY! 🎉</span>
            <FiGift className="text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-700 mb-0.5">
            {metrics.totalToday}
          </div>
          <small className="text-rose-600 text-[11px] font-semibold">
            {metrics.totalToday > 0 ? '¡Saludar ahora!' : 'Ninguna hoy'}
          </small>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-200 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-amber-700 font-semibold uppercase tracking-wider">PRÓXIMOS 7 DÍAS</span>
            <FiClock className="text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-800 mb-0.5">
            {metrics.totalNext7Days}
          </div>
          <small className="text-bunny-text-muted/70 text-[11px]">
            Para agendar turnos
          </small>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-200 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">SALUDADAS ESTE AÑO</span>
            <FaCheckCircle className="text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-800 mb-0.5">
            {metrics.totalGreetedThisYear}
          </div>
          <small className="text-bunny-text-muted/70 text-[11px]">
            {new Date().getFullYear()}
          </small>
        </div>
      </div>

      {/* ══ 2. Barra de Filtros y Buscador ═════════════════════════════════ */}
      <Card className="border border-bunny-border shadow-sm bg-white">
        <Card.Body className="p-3.5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Mes */}
            <div className="md:col-span-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full text-xs sm:text-sm rounded-lg border border-bunny-accent/60 p-2 font-semibold text-bunny-dark focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtros rápidos */}
            <div className="md:col-span-5 flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setQuickFilter('THIS_MONTH');
                  setSelectedMonth(currentMonthNumber);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  quickFilter === 'THIS_MONTH'
                    ? 'bg-bunny-primary text-white border-bunny-primary shadow-sm'
                    : 'bg-white text-bunny-primary border-bunny-accent/60 hover:bg-bunny-light/30'
                }`}
              >
                🎂 Este Mes
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickFilter('TODAY');
                  setSelectedMonth(0);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  quickFilter === 'TODAY'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
                }`}
              >
                🎉 Cumplen Hoy ({metrics.totalToday})
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickFilter('NEXT_7_DAYS');
                  setSelectedMonth(0);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  quickFilter === 'NEXT_7_DAYS'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                }`}
              >
                ⏳ 7 Días
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickFilter('ALL');
                  setSelectedMonth(0);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  quickFilter === 'ALL'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-bunny-text-muted border-bunny-border hover:bg-bunny-paper'
                }`}
              >
                Todos
              </button>
            </div>

            {/* Buscador */}
            <div className="md:col-span-4 relative">
              <input
                type="text"
                placeholder="Buscar clienta, RUT, teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-lg border border-bunny-accent/60 pl-8 pr-8 p-2 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              />
              <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-bunny-dark/60 text-xs" />
              {searchQuery && (
                <FaTimes
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bunny-dark/60 cursor-pointer text-xs hover:text-bunny-dark"
                />
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* ══ 3. Listado de Cumpleañeras ══════════════════════════════════════ */}
      <Card className="border border-bunny-border shadow-sm bg-white overflow-hidden">
        <Card.Header className="bg-bunny-paper border-b border-bunny-border py-3 px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FaBirthdayCake className="text-bunny-primary" />
            <span className="font-bold text-bunny-dark text-sm sm:text-base">
              Cumpleañeras ({filteredCustomers.length})
            </span>
          </div>
          {metrics.totalWithoutBirthDate > 0 && (
            <small className="text-bunny-dark/70 text-xs">
              ℹ️ {metrics.totalWithoutBirthDate} clientas sin fecha de nacimiento en su ficha
            </small>
          )}
        </Card.Header>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-bunny-creamy/40 border-b border-bunny-accent/40 text-bunny-dark/80 font-semibold uppercase text-xs tracking-wider">
              <tr>
                <th className="py-3 px-4">Clienta</th>
                <th className="py-3 px-4">Fecha de Cumpleaños</th>
                <th className="py-3 px-4">Edad a Cumplir</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Saludo {new Date().getFullYear()}</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bunny-border">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-bunny-text-muted/70">
                    <FaBirthdayCake size={32} className="mx-auto mb-2 opacity-30 text-bunny-primary" />
                    <div>No hay cumpleañeras registradas con los filtros seleccionados.</div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((bc) => (
                  <tr
                    key={bc.customer.id}
                    className={`transition-colors hover:bg-bunny-paper/60 ${
                      bc.isToday ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-bunny-dark text-sm">
                        {bc.customer.fullName}
                      </div>
                      <div className="text-xs text-bunny-text-muted mt-0.5">
                        {(bc.customer as any).rut ? `RUT: ${(bc.customer as any).rut} • ` : ''}
                        📱 {bc.customer.phone || 'Sin teléfono'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-bunny-primary">
                        {bc.formattedBirthDay}
                      </div>
                      <small className="text-bunny-text-muted/70 text-xs">
                        {bc.birthDate}
                      </small>
                    </td>

                    <td className="py-3 px-4">
                      {bc.ageToTurn ? (
                        <Badge variant="secondary">
                          {bc.ageToTurn} años
                        </Badge>
                      ) : (
                        <span className="text-bunny-text-muted/70">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {bc.isToday ? (
                        <Badge variant="danger" className="animate-pulse px-2 py-1">
                          🎉 ¡CUMPLE HOY!
                        </Badge>
                      ) : bc.isNext7Days ? (
                        <Badge variant="warning" className="px-2 py-1">
                          En {bc.daysUntilBirthday} día(s)
                        </Badge>
                      ) : bc.isThisMonth ? (
                        <Badge variant="secondary">
                          Este mes
                        </Badge>
                      ) : (
                        <span className="text-bunny-text-muted/70 text-xs">Mes {bc.birthMonthNumber}</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {bc.alreadyGreetedThisYear ? (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="success" className="text-[11px]">
                            <FaCheckCircle className="mr-1 inline" /> Saludada
                          </Badge>
                          <button
                            type="button"
                            className="text-bunny-text-muted/70 hover:text-bunny-text-muted transition-colors p-1"
                            title="Restablecer para volver a enviar"
                            onClick={() => handleResetGreeting(bc)}
                          >
                            <FiRefreshCw size={12} />
                          </button>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="opacity-70 text-[11px]">
                          Pendiente
                        </Badge>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-1.5 justify-end items-center">
                        <button
                          type="button"
                          onClick={() => handleDirectWhatsApp(bc)}
                          disabled={!bc.customer.phone}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          <FaWhatsapp /> Saludar
                        </button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenModal(bc)}
                          title="Personalizar mensaje y regalo"
                          className="p-1.5"
                        >
                          <FiGift />
                        </Button>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(`/customers/${bc.customer.id}`)}
                          title="Ver Ficha Completa"
                          className="p-1.5"
                        >
                          <FaEye />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Saludo Personalizado */}
      <BirthdayMessageModal
        show={showModal}
        onHide={() => setShowModal(false)}
        birthdayCustomer={selectedCustomerForModal}
        onGreetingSent={() => setRefreshTrigger((p) => p + 1)}
      />
    </div>
  );
};

export default CustomerBirthdaysTab;
