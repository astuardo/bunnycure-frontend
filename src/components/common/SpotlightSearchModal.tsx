import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal, Form, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch,
  FiUser,
  FiCalendar,
  FiScissors,
  FiDollarSign,
  FiPlus,
  FiGift,
  FiTrendingUp,
  FiSettings,
  FiSlash,
  FiCornerDownLeft,
} from 'react-icons/fi';
import { useCustomersStore } from '../../stores/customersStore';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { useServicesStore } from '../../stores/servicesStore';
import { getAppointmentTotal } from '../../utils/appointmentUtils';
import { matchRutSearch } from '../../utils/rutUtils';

interface SpotlightSearchModalProps {
  show: boolean;
  onHide: () => void;
  onOpenCashClosing?: () => void;
}

interface SpotlightItem {
  id: string;
  category: 'ACTIONS' | 'CUSTOMERS' | 'APPOINTMENTS' | 'SERVICES';
  categoryLabel: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  onSelect: () => void;
}

export const SpotlightSearchModal: React.FC<SpotlightSearchModalProps> = ({
  show,
  onHide,
  onOpenCashClosing,
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const { customers, fetchCustomers } = useCustomersStore();
  const { appointments, fetchAppointments } = useAppointmentsStore();
  const { services, fetchServices } = useServicesStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Cargar datos cuando se abre el modal si no están cargados
  useEffect(() => {
    if (show) {
      setQuery('');
      setSelectedIndex(0);
      if (customers.length === 0) fetchCustomers();
      if (appointments.length === 0) fetchAppointments();
      if (services.length === 0) fetchServices();

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [show]);

  // Lista de Acciones Rápidas del Salón
  const quickActions: SpotlightItem[] = useMemo(
    () => [
      {
        id: 'action-new-appointment',
        category: 'ACTIONS',
        categoryLabel: '⚡ ACCIONES RÁPIDAS',
        icon: <FiPlus style={{ color: '#8c2a3e' }} />,
        title: 'Nueva Cita',
        subtitle: 'Agendar atención para una clienta',
        badge: 'Atajo',
        onSelect: () => {
          onHide();
          navigate('/appointments?create=1');
        },
      },
      {
        id: 'action-new-customer',
        category: 'ACTIONS',
        categoryLabel: '⚡ ACCIONES RÁPIDAS',
        icon: <FiUser style={{ color: '#2e7d32' }} />,
        title: 'Nuevo Cliente',
        subtitle: 'Registrar nueva clienta en el directorio',
        badge: 'Atajo',
        onSelect: () => {
          onHide();
          navigate('/customers?create=1');
        },
      },
      {
        id: 'action-cash-closing',
        category: 'ACTIONS',
        categoryLabel: '⚡ ACCIONES RÁPIDAS',
        icon: <FiDollarSign style={{ color: '#d97706' }} />,
        title: 'Cierre de Caja & Finanzas',
        subtitle: 'Ver resumen contable diario o mensual con PDF/Excel',
        badge: 'Finanzas',
        onSelect: () => {
          onHide();
          if (onOpenCashClosing) {
            onOpenCashClosing();
          } else {
            navigate('/analytics');
          }
        },
      },
      {
        id: 'action-birthdays',
        category: 'ACTIONS',
        categoryLabel: '⚡ ACCIONES RÁPIDAS',
        icon: <span style={{ fontSize: '15px' }}>🎂</span>,
        title: 'Cumpleañeras del Mes',
        subtitle: 'Ver clientas que cumplen años y enviar saludo por WhatsApp',
        badge: 'Fidelización',
        onSelect: () => {
          onHide();
          navigate('/customers?tab=birthdays');
        },
      },
      {
        id: 'action-reactivation',
        category: 'ACTIONS',
        categoryLabel: '⚡ ACCIONES RÁPIDAS',
        icon: <span style={{ fontSize: '15px' }}>✨</span>,
        title: 'Reactivación de Clientas',
        subtitle: 'Clientas inactivas con más de 20 días sin agendar',
        badge: 'Marketing',
        onSelect: () => {
          onHide();
          navigate('/customers?tab=reactivation');
        },
      },
      {
        id: 'action-manage-blocks',
        category: 'ACTIONS',
        categoryLabel: '⚡ ACCIONES RÁPIDAS',
        icon: <FiSlash style={{ color: '#dc2626' }} />,
        title: 'Bloquear Agenda / Feriados',
        subtitle: 'Definir días cerrados o tramos horarios no disponibles',
        badge: 'Calendario',
        onSelect: () => {
          onHide();
          navigate('/calendar?manageBlocks=1');
        },
      },
      {
        id: 'action-generate-giftcard',
        category: 'ACTIONS',
        categoryLabel: '⚡ ACCIONES RÁPIDAS',
        icon: <FiGift style={{ color: '#7c3aed' }} />,
        title: 'Emitir GiftCard',
        subtitle: 'Generar tarjeta de regalo con código y PIN seguro',
        badge: 'GiftCard',
        onSelect: () => {
          onHide();
          navigate('/giftcards/generar');
        },
      },
      {
        id: 'action-analytics',
        category: 'ACTIONS',
        categoryLabel: '⚡ ACCIONES RÁPIDAS',
        icon: <FiTrendingUp style={{ color: '#0284c7' }} />,
        title: 'Ver Analíticas & Rendimiento',
        subtitle: 'Productividad, Top clientas y servicios completados',
        badge: 'Reportes',
        onSelect: () => {
          onHide();
          navigate('/analytics');
        },
      },
      {
        id: 'action-settings',
        category: 'ACTIONS',
        categoryLabel: '⚡ ACCIONES RÁPIDAS',
        icon: <FiSettings style={{ color: '#64748b' }} />,
        title: 'Configuración del Negocio',
        subtitle: 'Horarios, teléfono oficial de WhatsApp y recordatorios',
        badge: 'Ajustes',
        onSelect: () => {
          onHide();
          navigate('/settings');
        },
      },
    ],
    [navigate, onHide, onOpenCashClosing]
  );

  // Filtrado reactivo unificado
  const results: SpotlightItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      // Mostrar acciones rápidas por defecto
      return quickActions.slice(0, 6);
    }

    const matchedActions = quickActions.filter(
      (a) => a.title.toLowerCase().includes(q) || (a.subtitle && a.subtitle.toLowerCase().includes(q))
    );

    // 1. Clientas
    const matchedCustomers: SpotlightItem[] = customers
      .filter((c) => {
        const name = (c.fullName || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const rutMatches = matchRutSearch(q, (c as any).rut);
        return name.includes(q) || rutMatches || phone.includes(q) || email.includes(q);
      })
      .slice(0, 6)
      .map((c) => ({
        id: `customer-${c.id}`,
        category: 'CUSTOMERS',
        categoryLabel: '👥 CLIENTAS',
        icon: <FiUser style={{ color: '#2e7d32' }} />,
        title: c.fullName || 'Clienta',
        subtitle: `${(c as any).rut ? `RUT: ${(c as any).rut} • ` : ''}📱 ${c.phone || 'Sin teléfono'}${c.email ? ` • ✉️ ${c.email}` : ''}`,
        badge: 'Clienta',
        onSelect: () => {
          onHide();
          navigate(`/customers/${c.id}`);
        },
      }));

    // 2. Citas
    const matchedAppointments: SpotlightItem[] = appointments
      .filter((apt) => {
        const cName = (apt.customer?.fullName || '').toLowerCase();
        const date = (apt.appointmentDate || '').toLowerCase();
        const sNames = apt.services ? apt.services.map((s) => s.name.toLowerCase()).join(' ') : (apt.service?.name || '').toLowerCase();
        const rutMatches = matchRutSearch(q, (apt.customer as any)?.rut);
        return cName.includes(q) || rutMatches || date.includes(q) || sNames.includes(q);
      })
      .slice(0, 5)
      .map((apt) => {
        const total = getAppointmentTotal(apt);
        const sTitle = apt.services && apt.services.length > 0 ? apt.services.map((s) => s.name).join(' + ') : apt.service?.name || 'Manicure';
        return {
          id: `apt-${apt.id}`,
          category: 'APPOINTMENTS',
          categoryLabel: '📅 CITAS',
          icon: <FiCalendar style={{ color: '#8c2a3e' }} />,
          title: `${apt.customer?.fullName || 'Clienta'} - ${sTitle}`,
          subtitle: `📅 ${apt.appointmentDate.slice(0, 10)} a las ${apt.appointmentTime || '00:00'} • $${total.toLocaleString('es-CL')}`,
          badge: apt.status === 'COMPLETED' ? 'Completada' : apt.status === 'CONFIRMED' ? 'Confirmada' : 'Pendiente',
          onSelect: () => {
            onHide();
            navigate(`/appointments`);
          },
        };
      });

    // 3. Servicios
    const matchedServices: SpotlightItem[] = services
      .filter((s) => {
        const sName = (s.name || '').toLowerCase();
        const cat = ((s as any).category || (s as any).description || '').toLowerCase();
        return sName.includes(q) || cat.includes(q);
      })
      .slice(0, 4)
      .map((s) => ({
        id: `service-${s.id}`,
        category: 'SERVICES',
        categoryLabel: '💅 SERVICIOS',
        icon: <FiScissors style={{ color: '#0284c7' }} />,
        title: s.name,
        subtitle: `${(s as any).category || 'Servicio'} • Duración: ${s.durationMinutes || 60} min • $${(s.price || 0).toLocaleString('es-CL')}`,
        badge: 'Servicio',
        onSelect: () => {
          onHide();
          navigate('/services');
        },
      }));

    return [...matchedActions, ...matchedCustomers, ...matchedAppointments, ...matchedServices];
  }, [query, quickActions, customers, appointments, services, navigate, onHide]);

  // Manejo de Teclado (Flechas arriba/abajo, Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].onSelect();
      }
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      dialogClassName="spotlight-modal-dialog"
      contentClassName="border-0 shadow-lg"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <div
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 12px 40px rgba(92, 61, 46, 0.25)',
        }}
      >
        {/* Input de Búsqueda */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #eed0c5',
            background: '#fdf6f3',
            gap: '12px',
          }}
        >
          <FiSearch style={{ fontSize: '22px', color: '#8c2a3e', flexShrink: 0 }} />
          <Form.Control
            ref={inputRef}
            type="text"
            placeholder="Buscar clienta, RUT, cita, servicio o acción rápida..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '16px',
              color: '#422314',
              boxShadow: 'none',
              padding: 0,
              fontWeight: 500,
            }}
          />
          <Badge
            bg="light"
            text="dark"
            style={{
              border: '1px solid #eed0c5',
              fontSize: '11px',
              padding: '4px 8px',
              color: '#8c6052',
            }}
          >
            ESC
          </Badge>
        </div>

        {/* Lista de Resultados */}
        <div
          style={{
            maxHeight: '440px',
            overflowY: 'auto',
            padding: '10px 12px',
            background: '#fff',
          }}
        >
          {results.length === 0 ? (
            <div className="text-center py-5" style={{ color: '#8c6052' }}>
              <FiSearch size={32} className="mb-2 opacity-50" />
              <div className="fw-semibold">No se encontraron resultados para "{query}"</div>
              <small style={{ fontSize: '12px', color: '#b09080' }}>
                Prueba buscando por nombre de clienta, RUT, servicio o atajos como "Cierre" o "Nueva Cita".
              </small>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              // Mostrar encabezado de categoría si es el primer item de su grupo
              const isFirstInCategory = idx === 0 || results[idx - 1].category !== item.category;

              return (
                <React.Fragment key={item.id}>
                  {isFirstInCategory && (
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#8c6052',
                        padding: '8px 12px 4px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {item.categoryLabel}
                    </div>
                  )}

                  <div
                    onClick={() => item.onSelect()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected ? '#fdf0ec' : 'transparent',
                      border: isSelected ? '1px solid #eed0c5' : '1px solid transparent',
                      transition: 'all 0.12s ease',
                      marginBottom: '2px',
                    }}
                  >
                    <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: isSelected ? '#fae2dc' : '#fdf6f3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: isSelected ? 700 : 600,
                            color: '#422314',
                            fontSize: '14px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#8c6052',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 flex-shrink-0 ms-2">
                      {item.badge && (
                        <Badge
                          bg="light"
                          text="dark"
                          style={{
                            fontSize: '10.5px',
                            border: '1px solid #eed0c5',
                            fontWeight: 500,
                          }}
                        >
                          {item.badge}
                        </Badge>
                      )}
                      {isSelected && <FiCornerDownLeft style={{ color: '#8c2a3e', fontSize: '13px' }} />}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer con atajos de teclado */}
        <div
          style={{
            padding: '10px 16px',
            background: '#fdf6f3',
            borderTop: '1px solid #eed0c5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11.5px',
            color: '#8c6052',
          }}
        >
          <div className="d-flex gap-3">
            <span>
              <kbd style={{ background: '#fff', color: '#422314', border: '1px solid #eed0c5' }}>↑</kbd>{' '}
              <kbd style={{ background: '#fff', color: '#422314', border: '1px solid #eed0c5' }}>↓</kbd> Navegar
            </span>
            <span>
              <kbd style={{ background: '#fff', color: '#422314', border: '1px solid #eed0c5' }}>↵</kbd> Seleccionar
            </span>
            <span>
              <kbd style={{ background: '#fff', color: '#422314', border: '1px solid #eed0c5' }}>ESC</kbd> Cerrar
            </span>
          </div>

          <div className="d-none d-md-block fw-semibold" style={{ color: '#8c2a3e' }}>
            🐰 BunnyCure Spotlight
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SpotlightSearchModal;
