import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FiPlus,
  FiEdit2,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiGlobe,
  FiExternalLink,
  FiUsers,
  FiCalendar,
  FiShield,
} from 'react-icons/fi';
import DashboardLayout from '../../components/common/DashboardLayout';
import { tenantsApi } from '../../api/tenants.api';
import { TenantAdmin, TenantCreateFormData, TenantUpdateFormData } from '../../types/tenant.types';
import { TenantFormModal } from '../../components/admin/TenantFormModal';
import { useToast } from '../../hooks/useToast';
import { Card, Button, Badge, BadgeVariant, Spinner, Modal, Input } from '../../components/ui';

export default function TenantsPage() {
  const toast = useToast();

  const [tenants, setTenants] = useState<TenantAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantAdmin | null>(null);

  const [statusCandidate, setStatusCandidate] = useState<TenantAdmin | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tenantsApi.list();
      setTenants(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar salones';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.customDomain && t.customDomain.toLowerCase().includes(q)) ||
        (t.email && t.email.toLowerCase().includes(q));

      const matchesPlan = planFilter === 'ALL' || t.planTier === planFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && t.active) ||
        (statusFilter === 'INACTIVE' && !t.active);

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [tenants, search, planFilter, statusFilter]);

  // Métricas agregadas
  const stats = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((t) => t.active).length;
    const totalAppointments = tenants.reduce((acc, t) => acc + (t.appointmentCount || 0), 0);
    const totalCustomers = tenants.reduce((acc, t) => acc + (t.customerCount || 0), 0);
    return { total, active, totalAppointments, totalCustomers };
  }, [tenants]);

  const handleCreateOrUpdate = async (data: TenantCreateFormData | TenantUpdateFormData) => {
    if (editingTenant) {
      await tenantsApi.update(editingTenant.id, data as TenantUpdateFormData);
      toast.success('Salón actualizado exitosamente');
    } else {
      await tenantsApi.create(data as TenantCreateFormData);
      toast.success('Salón y administrador inicial aprovisionados exitosamente');
    }
    fetchTenants();
  };

  const handleToggleStatusConfirm = async () => {
    if (!statusCandidate) return;
    try {
      setUpdatingStatus(true);
      await tenantsApi.toggleStatus(statusCandidate.id, !statusCandidate.active);
      toast.success(
        `Salón ${statusCandidate.name} ${statusCandidate.active ? 'desactivado' : 'activado'} correctamente`
      );
      setStatusCandidate(null);
      fetchTenants();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar estado del salón';
      toast.error(msg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getPlanBadgeVariant = (plan: string): BadgeVariant => {
    switch (plan.toUpperCase()) {
      case 'VIP':
        return 'danger';
      case 'PRO':
        return 'primary';
      default:
        return 'neutral';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Cabecera Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#5c3d2e] tracking-tight flex items-center gap-2">
              <span>🏢</span> Plataforma SaaS Multi-Salón
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Aprovisionamiento, métricas de actividad y control centralizado de salones.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchTenants}
              disabled={loading}
              title="Refrescar salones"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditingTenant(null);
                setShowModal(true);
              }}
            >
              <FiPlus className="mr-1.5" /> Nuevo Salón
            </Button>
          </div>
        </div>

        {/* Tarjetas de Métricas de Plataforma */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-4 bg-gradient-to-br from-white to-[#fdf9f7] border-[#f0e0d8]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Salones Registrados</p>
                <p className="text-2xl font-extrabold text-[#5c3d2e] mt-1">{stats.total}</p>
              </div>
              <span className="text-2xl p-2.5 bg-[#f5ebe6] rounded-xl text-[#d48b70]">🏢</span>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-white to-[#fdf9f7] border-[#f0e0d8]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Salones Activos</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.active}</p>
              </div>
              <span className="text-2xl p-2.5 bg-emerald-50 rounded-xl text-emerald-600">✨</span>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-white to-[#fdf9f7] border-[#f0e0d8]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Citas Globales</p>
                <p className="text-2xl font-extrabold text-[#5c3d2e] mt-1">{stats.totalAppointments}</p>
              </div>
              <span className="text-2xl p-2.5 bg-[#f5ebe6] rounded-xl text-[#d48b70]">📅</span>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-white to-[#fdf9f7] border-[#f0e0d8]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Clientes en Red</p>
                <p className="text-2xl font-extrabold text-[#5c3d2e] mt-1">{stats.totalCustomers}</p>
              </div>
              <span className="text-2xl p-2.5 bg-[#f5ebe6] rounded-xl text-[#d48b70]">👥</span>
            </div>
          </Card>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <Card className="p-4 border-[#f0e0d8]">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre, slug, dominio o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#d48b70]"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
              >
                <option value="ALL">Todos los Planes</option>
                <option value="STANDARD">Plan Standard</option>
                <option value="PRO">Plan Pro</option>
                <option value="VIP">Plan VIP Enterprise</option>
              </select>

              <select
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#d48b70]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ACTIVE">Solo Activos</option>
                <option value="INACTIVE">Solo Inactivos</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Listado de Salones */}
        {loading ? (
          <div className="py-16 text-center">
            <Spinner size="lg" />
            <p className="text-sm text-gray-500 mt-2">Cargando salones de la plataforma...</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-gray-200">
            <div className="text-4xl mb-3">🏢</div>
            <h3 className="text-lg font-bold text-gray-700">No se encontraron salones</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              {search || planFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Intenta ajustar los criterios de búsqueda o filtros.'
                : 'Comienza aprovisionando el primer salón secundario para la plataforma.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTenants.map((t) => (
              <Card
                key={t.id}
                className="p-5 border-[#f0e0d8] hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Header de la tarjeta */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {t.logoUrl ? (
                        <img
                          src={t.logoUrl}
                          alt={t.name}
                          className="w-11 h-11 rounded-xl object-contain border border-gray-200 p-1 bg-white"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
                          style={{ backgroundColor: t.primaryColor || '#d48b70' }}
                        >
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-[#5c3d2e] text-base leading-tight">
                            {t.name}
                          </h3>
                          {t.id === 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#f5ebe6] text-[#7a5c4d] border border-[#f0e0d8]">
                              <FiShield className="mr-0.5" /> Matriz
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 font-mono">@{t.slug}</p>
                      </div>
                    </div>

                    <Badge variant={getPlanBadgeVariant(t.planTier)}>
                      {t.planTier}
                    </Badge>
                  </div>

                  {/* Dominio y URLs */}
                  <div className="space-y-1.5 text-xs text-gray-600 mb-4 bg-[#fdfaf8] p-2.5 rounded-lg border border-[#f5ede8]">
                    {t.customDomain ? (
                      <div className="flex items-center gap-1.5 text-indigo-700 font-medium">
                        <FiGlobe className="flex-shrink-0" />
                        <span className="truncate">{t.customDomain}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <FiGlobe className="flex-shrink-0 text-gray-400" />
                        <span>Sin dominio propio configurado</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-gray-200/50">
                      <span className="text-[11px] text-gray-500">Portal Público:</span>
                      <a
                        href={`/reservar?salon=${t.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#d48b70] hover:underline font-medium text-[11px]"
                      >
                        Abrir <FiExternalLink />
                      </a>
                    </div>
                  </div>

                  {/* Métricas del Salón */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-gray-100 text-center mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold flex items-center justify-center gap-1">
                        <FiUsers /> Personal
                      </p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{t.userCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold flex items-center justify-center gap-1">
                        <FiCalendar /> Citas
                      </p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{t.appointmentCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold flex items-center justify-center gap-1">
                        👥 Clientes
                      </p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{t.customerCount}</p>
                    </div>
                  </div>
                </div>

                {/* Footer de Tarjeta y Acciones */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    {t.active ? (
                      <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <FiCheckCircle className="mr-1 text-emerald-600" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        <FiXCircle className="mr-1" /> Inactivo
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {t.id !== 1 && (
                      <button
                        type="button"
                        onClick={() => setStatusCandidate(t)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                          t.active
                            ? 'border-gray-200 text-gray-600 hover:bg-gray-100'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={t.active ? 'Desactivar salón' : 'Activar salón'}
                      >
                        {t.active ? 'Desactivar' : 'Activar'}
                      </button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTenant(t);
                        setShowModal(true);
                      }}
                    >
                      <FiEdit2 className="mr-1" /> Editar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de Creación / Edición */}
        <TenantFormModal
          show={showModal}
          tenant={editingTenant}
          onHide={() => setShowModal(false)}
          onSave={handleCreateOrUpdate}
        />

        {/* Modal de Confirmación de Cambio de Estado */}
        {statusCandidate && (
          <Modal show={true} onHide={() => setStatusCandidate(null)} size="sm">
            <Modal.Header closeButton>
              <Modal.Title>
                {statusCandidate.active ? '¿Desactivar Salón?' : '¿Activar Salón?'}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-gray-600">
                {statusCandidate.active
                  ? `Al desactivar ${statusCandidate.name}, los usuarios de este salón no podrán iniciar sesión ni se aceptarán reservas en línea.`
                  : `Al activar ${statusCandidate.name}, el personal podrá acceder a su panel y el portal público quedará disponible.`}
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => setStatusCandidate(null)}
                disabled={updatingStatus}
              >
                Cancelar
              </Button>
              <Button
                variant={statusCandidate.active ? 'danger' : 'primary'}
                onClick={handleToggleStatusConfirm}
                isLoading={updatingStatus}
              >
                {statusCandidate.active ? 'Confirmar Desactivación' : 'Confirmar Activación'}
              </Button>
            </Modal.Footer>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
