import { useEffect, useMemo, useState } from 'react';
import {
  FiTrendingUp,
  FiShoppingBag,
  FiLayers,
  FiAlertTriangle,
  FiCheckCircle,
  FiPackage,
  FiRefreshCw,
  FiPlus,
} from 'react-icons/fi';
import DashboardLayout from '@/components/common/DashboardLayout';
import { inventoryApi } from '@/api/inventory.api';
import { settingsApi } from '@/api/settings.api';
import { Product, StockProjection } from '@/types/inventory.types';
import ProductList from '@/components/ProductList';
import ProductFormModal from '@/components/ProductFormModal';
import PurchaseFormModal from '@/components/PurchaseFormModal';
import MovementListModal from '@/components/MovementListModal';
import ProductPriceAnalysisModal from '@/components/inventory/ProductPriceAnalysisModal';
import { useToast } from '@/hooks/useToast';
import { formatCurrencyCLP } from '@/utils/formatters';
import { Card, Button, Badge, Alert, Spinner } from '@/components/ui';
import { confirmDialog } from '../components/ui/confirmDialog';

export default function ProductsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'inventory' | 'projections'>('inventory');

  const [products, setProducts] = useState<Product[]>([]);
  const [projections, setProjections] = useState<StockProjection[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProjections, setLoadingProjections] = useState(false);

  // Master switch
  const [autoConsumptionEnabled, setAutoConsumptionEnabled] = useState(true);
  const [savingSwitch, setSavingSwitch] = useState(false);

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [purchaseProduct, setPurchaseProduct] = useState<Product | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [movementsProductId, setMovementsProductId] = useState<number | null>(null);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [priceAnalysisProductId, setPriceAnalysisProductId] = useState<number | null>(null);
  const [showPriceAnalysisModal, setShowPriceAnalysisModal] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.listProducts();
      setProducts(data);
    } catch {
      toast.error('No se pudo cargar el inventario');
    } finally {
      setLoading(false);
    }
  };

  const loadProjections = async () => {
    setLoadingProjections(true);
    try {
      const data = await inventoryApi.getStockProjections();
      setProjections(data);
    } catch (err) {
      console.error('Error loading projections:', err);
      toast.error('Error al cargar proyecciones de demanda');
    } finally {
      setLoadingProjections(false);
    }
  };

  const loadSettings = async () => {
    try {
      const val = await settingsApi.get('inventory.auto_consumption.enabled');
      if (val !== null) {
        setAutoConsumptionEnabled(val === 'true');
      }
    } catch {
      // Default to true
    }
  };

  useEffect(() => {
    loadProducts();
    loadProjections();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleAutoConsumption = async (enabled: boolean) => {
    setSavingSwitch(true);
    try {
      await settingsApi.update('inventory.auto_consumption.enabled', String(enabled));
      setAutoConsumptionEnabled(enabled);
      toast.success(
        enabled
          ? '✅ Control de consumo en citas ACTIVADO'
          : '⚠️ Control de consumo en citas DESACTIVADO (no se solicitarán ni descontarán insumos)'
      );
    } catch {
      toast.error('Error al guardar configuración de consumo');
    } finally {
      setSavingSwitch(false);
    }
  };

  const summary = useMemo(() => {
    const total = products.length;
    const withDeficit = products.filter((p) => (p.stockConsumptionUnit || 0) < 0).length;
    const critical7Days = projections.filter((p) => p.status === 'CRITICO_7_DIAS').length;
    const lowStock = projections.filter((p) => p.status === 'BAJO').length;

    return { total, withDeficit, critical7Days, lowStock };
  }, [products, projections]);

  const handleSaved = (product: Product) => {
    setProducts((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      return exists
        ? prev.map((item) => (item.id === product.id ? product : item))
        : [product, ...prev];
    });
    loadProjections();
  };

  const handleDelete = async (product: Product) => {
    if (!(await confirmDialog({ message: `¿Eliminar el producto "${product.name}"?`, confirmLabel: 'Eliminar', tone: 'danger' }))) return;
    try {
      await inventoryApi.deleteProduct(product.id);
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      toast.success('Producto eliminado');
      loadProjections();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = err?.response?.data?.error?.message || err?.message || 'Error al eliminar';
      toast.error(msg);
    }
  };

  const handleRefreshObserved = async (product: Product) => {
    try {
      const updated = await inventoryApi.refreshObservedPrice(product.id);
      handleSaved(updated);
      toast.success(`Precio observado actualizado: ${product.name}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = err?.response?.data?.error?.message || err?.message || 'No se pudo actualizar';
      toast.error(msg);
    }
  };

  const handlePurchaseSuggested = (proj: StockProjection) => {
    const product = products.find((p) => p.id === proj.productId);
    if (product) {
      setPurchaseProduct(product);
      setShowPurchaseModal(true);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header con Switch Maestro */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-bunny-cocoa tracking-tight flex items-center gap-2 m-0">
                📦 Inventario, Insumos y Proyecciones
              </h1>
              <Badge variant="neutral">
                {summary.total} {summary.total === 1 ? 'producto' : 'productos'}
              </Badge>
            </div>
            <p className="text-sm text-bunny-text-muted mt-1 m-0">
              Administra insumos, recetas por servicio, historial de compras y proyección de demanda a 7 días
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`p-2.5 px-3.5 rounded-xl border flex items-center gap-3 transition-colors ${
                autoConsumptionEnabled
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-rose-50/70 border-rose-200'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-bunny-cocoa">Control de Consumo en Citas</div>
                <span className="text-[11px] text-bunny-text-muted block">
                  {autoConsumptionEnabled ? '🟢 Activo: descuenta insumos' : '🔴 Apagado: no descuenta stock'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoConsumptionEnabled}
                disabled={savingSwitch}
                onChange={(e) => handleToggleAutoConsumption(e.target.checked)}
                className="h-4 w-4 rounded border-bunny-border text-bunny-primary focus:ring-bunny-primary/30 cursor-pointer accent-[#8c2a3e]"
              />
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowFormModal(true)}
              leftIcon={<FiPlus />}
            >
              Nuevo Producto
            </Button>
          </div>
        </div>

        {/* Tarjetas de Métricas Rápidas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="shadow-xs border-bunny-border">
            <Card.Body className="p-4 text-center">
              <span className="text-xs text-bunny-text-muted font-medium block">Total Productos</span>
              <span className="text-2xl font-bold text-bunny-cocoa mt-0.5 block">{summary.total}</span>
              <span className="text-[11px] text-bunny-text-muted">en catálogo</span>
            </Card.Body>
          </Card>
          <Card className="shadow-xs border-bunny-border">
            <Card.Body className="p-4 text-center">
              <span className="text-xs text-bunny-text-muted font-medium block">Stock con Déficit</span>
              <span
                className={`text-2xl font-bold mt-0.5 block ${
                  summary.withDeficit > 0 ? 'text-bunny-danger' : 'text-emerald-700'
                }`}
              >
                {summary.withDeficit}
              </span>
              <span className="text-[11px] text-bunny-text-muted">saldo en negativo</span>
            </Card.Body>
          </Card>
          <Card className="shadow-xs border-bunny-border">
            <Card.Body className="p-4 text-center">
              <span className="text-xs text-bunny-text-muted font-medium block">Críticos a 7 Días</span>
              <span
                className={`text-2xl font-bold mt-0.5 block ${
                  summary.critical7Days > 0 ? 'text-amber-600' : 'text-emerald-700'
                }`}
              >
                {summary.critical7Days}
              </span>
              <span className="text-[11px] text-bunny-text-muted">no alcanzarán las citas</span>
            </Card.Body>
          </Card>
          <Card className="shadow-xs border-bunny-border">
            <Card.Body className="p-4 text-center">
              <span className="text-xs text-bunny-text-muted font-medium block">Stock en Nivel Óptimo</span>
              <span className="text-2xl font-bold text-emerald-700 mt-0.5 block">
                {Math.max(0, summary.total - summary.withDeficit - summary.critical7Days)}
              </span>
              <span className="text-[11px] text-bunny-text-muted">abastecimiento seguro</span>
            </Card.Body>
          </Card>
        </div>

        {/* Pestañas / Tabs */}
        <div className="flex border-b border-bunny-border gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'inventory'
                ? 'border-bunny-primary text-bunny-primary-dark'
                : 'border-transparent text-bunny-text-muted hover:text-bunny-cocoa'
            }`}
          >
            <FiLayers /> Inventario &amp; Precios
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('projections');
              loadProjections();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'projections'
                ? 'border-bunny-primary text-bunny-primary-dark'
                : 'border-transparent text-bunny-text-muted hover:text-bunny-cocoa'
            }`}
          >
            <FiTrendingUp /> Proyección a 7 Días &amp; Reabastecimiento
            {summary.critical7Days > 0 && (
              <Badge variant="danger" className="text-[10px] ml-1">
                {summary.critical7Days}
              </Badge>
            )}
          </button>
        </div>

        {/* Tab 1: Inventario */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-bunny-text-muted">
                Monitorea existencias, precios de compra y registra nuevas entradas de insumos.
              </span>
              <Button variant="outline" size="sm" onClick={loadProducts} disabled={loading} leftIcon={<FiRefreshCw />}>
                Actualizar
              </Button>
            </div>

            <Card className="shadow-bunny border-bunny-border overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-bunny-text-muted">
                  <Spinner size="lg" variant="primary" />
                  <p className="text-sm mt-3">Cargando inventario...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-16 text-bunny-text-muted text-sm">
                  No hay productos registrados en el inventario.
                </div>
              ) : (
                <ProductList
                  products={products}
                  onEdit={(product) => {
                    setEditingProduct(product);
                    setShowFormModal(true);
                  }}
                  onDelete={handleDelete}
                  onPurchase={(product) => {
                    setPurchaseProduct(product);
                    setShowPurchaseModal(true);
                  }}
                  onViewMovements={(product) => {
                    setMovementsProductId(product.id);
                    setShowMovementsModal(true);
                  }}
                  onRefreshObserved={handleRefreshObserved}
                  onViewPriceAnalysis={(product) => {
                    setPriceAnalysisProductId(product.id);
                    setShowPriceAnalysisModal(true);
                  }}
                />
              )}
            </Card>
          </div>
        )}

        {/* Tab 2: Proyecciones a 7 Días */}
        {activeTab === 'projections' && (
          <div className="space-y-4">
            <Alert variant="info">
              <div className="flex items-start gap-2">
                <FiPackage className="text-base shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong>Proyección de Demanda Semanal (7 días):</strong> Cruza las citas agendadas de la semana con
                  la receta de cada servicio para predecir si el stock alcanzará o cuándo se agotará.
                </div>
              </div>
            </Alert>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={loadProjections}
                disabled={loadingProjections}
                leftIcon={<FiRefreshCw className={loadingProjections ? 'animate-spin' : ''} />}
              >
                Recalcular Proyecciones
              </Button>
            </div>

            <Card className="shadow-bunny border-bunny-border overflow-hidden">
              {loadingProjections ? (
                <div className="flex flex-col items-center justify-center py-16 text-bunny-text-muted">
                  <Spinner size="lg" variant="primary" />
                  <p className="text-sm mt-3">Calculando proyección de citas y demanda...</p>
                </div>
              ) : projections.length === 0 ? (
                <div className="text-center py-16 text-bunny-text-muted text-sm">
                  No hay productos para proyectar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-bunny-paper/70 border-b border-bunny-border text-xs font-semibold text-bunny-text-muted uppercase">
                        <th className="py-3 px-4">Insumo / Producto</th>
                        <th className="py-3 px-4">Stock Actual</th>
                        <th className="py-3 px-4">Demanda (7 Días)</th>
                        <th className="py-3 px-4">Balance Proyectado</th>
                        <th className="py-3 px-4">Servicios Restantes</th>
                        <th className="py-3 px-4">Sugerencia de Compra</th>
                        <th className="py-3 px-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bunny-border/60">
                      {projections.map((proj) => {
                        const isCritical = proj.status === 'CRITICO_7_DIAS' || proj.status === 'SIN_STOCK';
                        const isLow = proj.status === 'BAJO';

                        return (
                          <tr key={proj.productId} className="hover:bg-bunny-blush/20 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-bunny-cocoa">{proj.productName}</div>
                              <small className="text-xs text-bunny-text-muted block">
                                {proj.appointmentsNext7Days > 0
                                  ? `Usado en ${proj.appointmentsNext7Days} cita(s) esta semana`
                                  : 'Sin citas agendadas con este insumo'}
                              </small>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  proj.currentStockConsumptionUnit < 0
                                    ? 'danger'
                                    : proj.currentStockConsumptionUnit === 0
                                    ? 'warning'
                                    : 'success'
                                }
                                className="text-xs"
                              >
                                {proj.currentStockConsumptionUnit} {proj.consumptionUnit}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 font-semibold text-bunny-cocoa">
                              {proj.projectedDemand7Days} {proj.consumptionUnit}
                            </td>
                            <td className="py-3 px-4">
                              {proj.balanceAfter7Days < 0 ? (
                                <Badge variant="danger" className="gap-1 inline-flex items-center text-xs">
                                  <FiAlertTriangle /> Falta {Math.abs(proj.balanceAfter7Days).toFixed(1)}{' '}
                                  {proj.consumptionUnit}
                                </Badge>
                              ) : (
                                <Badge variant="success" className="text-xs">
                                  {proj.balanceAfter7Days.toFixed(1)} {proj.consumptionUnit} sobrantes
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs font-semibold text-bunny-cocoa">
                              ~{proj.servicesRemainingWithStock} atenciones
                            </td>
                            <td className="py-3 px-4">
                              {proj.suggestedPurchaseQuantity > 0 ? (
                                <div>
                                  <span className="font-bold text-xs text-bunny-danger block">
                                    Comprar {proj.suggestedPurchaseQuantity} {proj.purchaseUnit}(s)
                                  </span>
                                  <small className="text-[11px] text-bunny-text-muted block">
                                    Est. {formatCurrencyCLP(proj.estimatedRestockCost)}
                                  </small>
                                </div>
                              ) : (
                                <span className="text-emerald-700 text-xs font-semibold inline-flex items-center gap-1">
                                  <FiCheckCircle /> Stock suficiente
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant={isCritical ? 'danger' : isLow ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => handlePurchaseSuggested(proj)}
                                leftIcon={<FiShoppingBag />}
                              >
                                {proj.suggestedPurchaseQuantity > 0 ? 'Comprar' : 'Reabastecer'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Modales */}
        <ProductFormModal
          show={showFormModal}
          onHide={() => {
            setShowFormModal(false);
            setEditingProduct(null);
          }}
          onSaved={handleSaved}
          productToEdit={editingProduct}
        />

        <PurchaseFormModal
          show={showPurchaseModal}
          onHide={() => {
            setShowPurchaseModal(false);
            setPurchaseProduct(null);
          }}
          product={purchaseProduct}
          onPurchased={() => {
            loadProducts();
            loadProjections();
          }}
        />

        <MovementListModal
          show={showMovementsModal}
          onHide={() => {
            setShowMovementsModal(false);
            setMovementsProductId(null);
          }}
          productId={movementsProductId}
        />

        <ProductPriceAnalysisModal
          show={showPriceAnalysisModal}
          onHide={() => {
            setShowPriceAnalysisModal(false);
            setPriceAnalysisProductId(null);
          }}
          productId={priceAnalysisProductId}
        />
      </div>
    </DashboardLayout>
  );
}
