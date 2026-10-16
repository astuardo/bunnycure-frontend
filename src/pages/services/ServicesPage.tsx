import { useEffect, useState, useCallback } from 'react';
import { FiLayers, FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useServicesStore } from '../../stores/servicesStore';
import { ServiceCatalog, ServiceFormData } from '../../types/service.types';
import { Product, ServiceCostSummary } from '@/types/inventory.types';
import { inventoryApi } from '@/api/inventory.api';
import ServiceSuppliesModal from '@/components/services/ServiceSuppliesModal';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { useToast } from '../../hooks/useToast';
import { formatCurrencyCLP } from '@/utils/formatters';
import { Card, Button, Badge, Alert, Spinner, Modal, Input, Textarea } from '@/components/ui';

export default function ServicesPage() {
  const toast = useToast();
  const canUseInventory = usePlanFeatures().hasFeature('INVENTORY');
  const {
    services,
    isLoading,
    error,
    fetchServices,
    createService,
    updateService,
    deleteService,
    toggleServiceActive,
    clearError,
  } = useServicesStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [costsSummary, setCostsSummary] = useState<ServiceCostSummary[]>([]);
  const [selectedSuppliesService, setSelectedSuppliesService] = useState<ServiceCatalog | null>(null);
  const [showSuppliesModal, setShowSuppliesModal] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteCandidate, setDeleteCandidate] = useState<ServiceCatalog | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    durationMinutes: 60,
    price: 0,
    displayOrder: 0,
  });

  const loadSuppliesAndProducts = useCallback(async () => {
    try {
      const [prods, costs] = await Promise.all([
        inventoryApi.listProducts().catch(() => []),
        inventoryApi.getAllServicesCostsSummary().catch(() => []),
      ]);
      setProducts(prods);
      setCostsSummary(costs);
    } catch (err) {
      console.error('Error loading supplies data in services page:', err);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    if (!canUseInventory) {
      return; // insumos y costos solo en planes con inventario
    }
    void (async () => {
      await loadSuppliesAndProducts();
    })();
  }, [fetchServices, loadSuppliesAndProducts, canUseInventory]);

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    resetForm();
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingServiceId(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      durationMinutes: 60,
      price: 0,
      displayOrder: 0,
    });
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createService(formData);
      toast.success('Servicio creado exitosamente');
      handleCloseCreateModal();
    } catch (err: unknown) {
      console.error('Error creating service:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingServiceId) {
      try {
        setSubmitting(true);
        await updateService(editingServiceId, formData);
        toast.success('Servicio actualizado exitosamente');
        handleCloseEditModal();
      } catch (err: unknown) {
        console.error('Error updating service:', err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const openEditModal = (service: ServiceCatalog) => {
    setEditingServiceId(service.id);
    setFormData({
      name: service.name,
      description: service.description || '',
      durationMinutes: service.durationMinutes,
      price: service.price,
      displayOrder: service.displayOrder || 0,
    });
    setShowEditModal(true);
  };

  const handleToggleActive = async (id: number) => {
    try {
      await toggleServiceActive(id);
      toast.success('Estado del servicio actualizado');
    } catch (err: unknown) {
      console.error('Error toggling service active:', err);
    }
  };

  const handleOpenSupplies = (service: ServiceCatalog) => {
    setSelectedSuppliesService(service);
    setShowSuppliesModal(true);
  };

  const getServiceCostData = (serviceId: number) => {
    return costsSummary.find((c) => c.serviceId === serviceId);
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      setDeleting(true);
      await deleteService(deleteCandidate.id);
      toast.success('Servicio eliminado');
      setDeleteCandidate(null);
    } catch (err: unknown) {
      console.error('Error deleting service:', err);
      toast.error('No se pudo eliminar el servicio');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-bunny-cocoa tracking-tight flex items-center gap-2 m-0">
                💅 Gestión de Servicios
              </h1>
              <Badge variant="neutral">
                {services.length} {services.length === 1 ? 'servicio' : 'servicios'}
              </Badge>
            </div>
            <p className="text-sm text-bunny-text-muted mt-1 m-0">
              Administra el catálogo de servicios ofrecidos y sus recetas de insumos
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              leftIcon={<FiPlus />}
            >
              Nuevo Servicio
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="danger">
            <div className="flex justify-between items-center w-full">
              <span>{error}</span>
              <button
                type="button"
                onClick={clearError}
                className="text-xs font-semibold underline ml-3"
              >
                Cerrar
              </button>
            </div>
          </Alert>
        )}

        {/* Contenido Principal */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-bunny-text-muted">
            <Spinner size="lg" variant="primary" />
            <p className="text-sm mt-3">Cargando catálogo de servicios...</p>
          </div>
        ) : services.length === 0 ? (
          <Alert variant="info">
            No hay servicios configurados. Haz clic en <strong>"+ Nuevo Servicio"</strong> para comenzar.
          </Alert>
        ) : (
          <>
            {/* Vista Desktop: Tabla */}
            <div className="hidden md:block">
              <Card className="shadow-bunny border-bunny-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-bunny-paper/70 border-b border-bunny-border text-xs font-semibold text-bunny-text-muted uppercase">
                        <th className="py-3.5 px-4">Nombre</th>
                        <th className="py-3.5 px-4">Descripción</th>
                        <th className="py-3.5 px-4">Duración</th>
                        <th className="py-3.5 px-4">Precio</th>
                        <th className="py-3.5 px-4">Insumos &amp; Margen</th>
                        <th className="py-3.5 px-4 text-center">Estado</th>
                        <th className="py-3.5 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bunny-border/60">
                      {services.map((service) => {
                        const costData = getServiceCostData(service.id);
                        const supplyCount = costData?.supplies?.length || 0;
                        const matCost = costData?.totalMaterialsCost || 0;
                        const marginPct = costData?.grossMarginPercentage || 0;

                        return (
                          <tr key={service.id} className="hover:bg-bunny-blush/20 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-bunny-cocoa">
                              {service.name}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-bunny-text max-w-xs truncate">
                              {service.description || (
                                <span className="text-bunny-text-muted italic">Sin descripción</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-bunny-cocoa font-medium whitespace-nowrap">
                              {service.durationMinutes} min
                            </td>
                            <td className="py-3.5 px-4 font-bold text-bunny-cocoa whitespace-nowrap">
                              {formatCurrencyCLP(service.price)}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenSupplies(service)}
                                  title="Gestionar insumos y receta del servicio"
                                  leftIcon={<FiLayers className="text-bunny-primary" />}
                                  className="text-xs py-1 px-2.5"
                                >
                                  Insumos ({supplyCount})
                                </Button>
                                {supplyCount > 0 ? (
                                  <span className="text-[11px] px-2 py-0.5 rounded-md border border-bunny-border bg-white text-bunny-text-muted whitespace-nowrap">
                                    Costo: {formatCurrencyCLP(Math.round(matCost))} | Margen: {marginPct.toFixed(0)}%
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-bunny-text-muted">Sin receta</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <Badge variant={service.active ? 'success' : 'neutral'}>
                                {service.active ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(service)}
                                  title="Editar servicio"
                                  className="p-1.5 rounded-lg border border-bunny-border text-bunny-cocoa hover:bg-bunny-blush/60 hover:border-bunny-terracotta/40 transition-colors"
                                >
                                  <FiEdit2 className="text-xs" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(service.id)}
                                  title={service.active ? 'Desactivar' : 'Activar'}
                                  className={`p-1.5 rounded-lg border transition-colors ${
                                    service.active
                                      ? 'border-bunny-border text-bunny-text-muted hover:bg-gray-100'
                                      : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                  }`}
                                >
                                  {service.active ? (
                                    <FiToggleRight className="text-sm text-emerald-600" />
                                  ) : (
                                    <FiToggleLeft className="text-sm text-gray-400" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteCandidate(service)}
                                  title="Eliminar servicio"
                                  className="p-1.5 rounded-lg border border-bunny-border text-bunny-danger hover:bg-rose-50 hover:border-rose-300 transition-colors"
                                >
                                  <FiTrash2 className="text-xs" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Vista Móvil: Cards */}
            <div className="md:hidden space-y-3">
              {services.map((service) => {
                const costData = getServiceCostData(service.id);
                const supplyCount = costData?.supplies?.length || 0;
                const matCost = costData?.totalMaterialsCost || 0;
                const marginPct = costData?.grossMarginPercentage || 0;

                return (
                  <Card key={service.id} className="shadow-xs border-bunny-border">
                    <Card.Body className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <h2 className="text-sm font-bold text-bunny-cocoa leading-snug">
                          {service.name}
                        </h2>
                        <Badge variant={service.active ? 'success' : 'neutral'} className="shrink-0">
                          {service.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>

                      <p className="text-xs text-bunny-text-muted m-0">
                        {service.description || 'Sin descripción'}
                      </p>

                      <div className="flex justify-between items-center text-xs pt-1">
                        <span className="text-bunny-text-muted font-medium">
                          ⏱️ {service.durationMinutes} min
                        </span>
                        <span className="font-bold text-sm text-bunny-primary-dark">
                          {formatCurrencyCLP(service.price)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-bunny-paper/50 border border-bunny-border flex justify-between items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenSupplies(service)}
                          leftIcon={<FiLayers className="text-bunny-primary" />}
                          className="text-xs py-1 px-2"
                        >
                          Insumos ({supplyCount})
                        </Button>
                        {supplyCount > 0 ? (
                          <span className="text-[11px] font-medium text-bunny-text-muted">
                            Costo: {formatCurrencyCLP(Math.round(matCost))} ({marginPct.toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="text-[11px] text-bunny-text-muted">Sin receta</span>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openEditModal(service)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant={service.active ? 'outline' : 'primary'}
                          className="flex-1"
                          onClick={() => handleToggleActive(service.id)}
                        >
                          {service.active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(service)}
                          className="p-2 rounded-xl border border-bunny-border text-bunny-danger hover:bg-rose-50"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Modal Crear */}
        <Modal show={showCreateModal} onHide={handleCloseCreateModal} size="md" centered>
          <Modal.Header closeButton>
            <Modal.Title>➕ Nuevo Servicio</Modal.Title>
          </Modal.Header>
          <form onSubmit={handleCreateService}>
            <Modal.Body className="space-y-4">
              <Input
                label="Nombre del servicio *"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Esmaltado Permanente"
              />

              <Textarea
                label="Descripción"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del servicio..."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="number"
                  label="Duración (minutos) *"
                  required
                  min={5}
                  step={5}
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })
                  }
                />
                <Input
                  type="number"
                  label="Precio *"
                  required
                  min={0}
                  step={100}
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <Input
                type="number"
                label="Orden de visualización"
                min={0}
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                }
                helperText="Número menor aparece primero en la lista."
              />
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseCreateModal}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={submitting}
                loadingText="Creando..."
              >
                Crear Servicio
              </Button>
            </Modal.Footer>
          </form>
        </Modal>

        {/* Modal Editar */}
        <Modal show={showEditModal} onHide={handleCloseEditModal} size="md" centered>
          <Modal.Header closeButton>
            <Modal.Title>✏️ Editar Servicio</Modal.Title>
          </Modal.Header>
          <form onSubmit={handleUpdateService}>
            <Modal.Body className="space-y-4">
              <Input
                label="Nombre del servicio *"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <Textarea
                label="Descripción"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="number"
                  label="Duración (minutos) *"
                  required
                  min={5}
                  step={5}
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })
                  }
                />
                <Input
                  type="number"
                  label="Precio *"
                  required
                  min={0}
                  step={100}
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <Input
                type="number"
                label="Orden de visualización"
                min={0}
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                }
              />
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseEditModal}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={submitting}
                loadingText="Guardando..."
              >
                Guardar Cambios
              </Button>
            </Modal.Footer>
          </form>
        </Modal>

        {/* Modal Insumos y Receta */}
        <ServiceSuppliesModal
          show={showSuppliesModal}
          onHide={() => {
            setShowSuppliesModal(false);
            setSelectedSuppliesService(null);
          }}
          service={selectedSuppliesService}
          products={products}
          onSaved={loadSuppliesAndProducts}
        />

        {/* Modal Confirmar Eliminación */}
        <Modal show={!!deleteCandidate} onHide={() => setDeleteCandidate(null)} size="sm" centered>
          <Modal.Header closeButton>
            <Modal.Title>⚠️ Confirmar Eliminación</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm text-bunny-text leading-relaxed m-0">
              ¿Estás seguro de eliminar el servicio{' '}
              <strong className="text-bunny-cocoa">{deleteCandidate?.name}</strong>? Esta acción no se
              puede deshacer.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteCandidate(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={deleting}
              loadingText="Eliminando..."
            >
              Eliminar Servicio
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
