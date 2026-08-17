import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Nav, Row, Spinner, Table } from 'react-bootstrap';
import { FiTrendingUp, FiShoppingBag, FiLayers, FiAlertTriangle, FiCheckCircle, FiPackage, FiRefreshCw } from 'react-icons/fi';
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
      return exists ? prev.map((item) => (item.id === product.id ? product : item)) : [product, ...prev];
    });
    loadProjections();
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`¿Eliminar producto "${product.name}"?`)) return;
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
      <div className="bunny-page">
        {/* Header con Switch Maestro */}
        <Row className="mb-3 mb-md-4 align-items-center">
          <Col md={7}>
            <h1 className="mb-1">📦 Inventario, Insumos y Proyecciones</h1>
            <p className="text-muted mb-0 small">
              Administra insumos, recetas por servicio, historial de compras y proyección de demanda a 7 días
            </p>
          </Col>
          <Col md={5} className="mt-3 mt-md-0 d-flex flex-column align-items-md-end gap-2">
            <div
              style={{
                background: autoConsumptionEnabled ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${autoConsumptionEnabled ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '12px',
                padding: '8px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div className="text-start">
                <div className="fw-bold small text-dark">Control de Consumo en Citas</div>
                <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                  {autoConsumptionEnabled ? '🟢 Activo: descuenta insumos' : '🔴 Apagado: no descuenta stock'}
                </small>
              </div>
              <Form.Check
                type="switch"
                id="master-consumption-switch"
                checked={autoConsumptionEnabled}
                disabled={savingSwitch}
                onChange={(e) => handleToggleAutoConsumption(e.target.checked)}
                style={{ transform: 'scale(1.25)', cursor: 'pointer' }}
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowFormModal(true)}
              className="d-inline-flex align-items-center gap-1"
            >
              ➕ Nuevo Producto
            </Button>
          </Col>
        </Row>

        {/* Tarjetas de Métricas Rápidas */}
        <Row className="g-3 mb-3 mb-md-4">
          <Col sm={6} md={3}>
            <Card className="h-100 border-0 shadow-sm" style={{ background: '#f8fafc' }}>
              <Card.Body className="p-3">
                <div className="text-muted small">Total Productos</div>
                <div className="fs-4 fw-bold text-dark">{summary.total}</div>
                <small className="text-muted">en catálogo</small>
              </Card.Body>
            </Card>
          </Col>
          <Col sm={6} md={3}>
            <Card className="h-100 border-0 shadow-sm" style={{ background: summary.withDeficit > 0 ? '#fff1f2' : '#f8fafc' }}>
              <Card.Body className="p-3">
                <div className="text-muted small">Stock con Déficit</div>
                <div className={`fs-4 fw-bold ${summary.withDeficit > 0 ? 'text-danger' : 'text-success'}`}>
                  {summary.withDeficit}
                </div>
                <small className="text-muted">saldo en negativo</small>
              </Card.Body>
            </Card>
          </Col>
          <Col sm={6} md={3}>
            <Card className="h-100 border-0 shadow-sm" style={{ background: summary.critical7Days > 0 ? '#fff7ed' : '#f8fafc' }}>
              <Card.Body className="p-3">
                <div className="text-muted small">Críticos a 7 Días</div>
                <div className={`fs-4 fw-bold ${summary.critical7Days > 0 ? 'text-warning' : 'text-success'}`}>
                  {summary.critical7Days}
                </div>
                <small className="text-muted">no alcanzarán las citas</small>
              </Card.Body>
            </Card>
          </Col>
          <Col sm={6} md={3}>
            <Card className="h-100 border-0 shadow-sm" style={{ background: '#f0fdf4' }}>
              <Card.Body className="p-3">
                <div className="text-muted small">Stock en Nivel Óptimo</div>
                <div className="fs-4 fw-bold text-success">
                  {summary.total - summary.withDeficit - summary.critical7Days}
                </div>
                <small className="text-muted">abastecimiento seguro</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Pestañas / Tabs */}
        <Nav variant="pills" className="mb-3 gap-2">
          <Nav.Item>
            <Nav.Link
              active={activeTab === 'inventory'}
              onClick={() => setActiveTab('inventory')}
              style={{ cursor: 'pointer', fontWeight: 600 }}
              className="d-flex align-items-center gap-2"
            >
              <FiLayers /> 📦 Inventario & Precios
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              active={activeTab === 'projections'}
              onClick={() => {
                setActiveTab('projections');
                loadProjections();
              }}
              style={{ cursor: 'pointer', fontWeight: 600 }}
              className="d-flex align-items-center gap-2"
            >
              <FiTrendingUp /> 📊 Proyección a 7 Días & Reabastecimiento
              {summary.critical7Days > 0 && (
                <Badge bg="danger" className="ms-1">
                  {summary.critical7Days}
                </Badge>
              )}
            </Nav.Link>
          </Nav.Item>
        </Nav>

        {/* Tab 1: Inventario */}
        {activeTab === 'inventory' && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-muted small">
                Monitorea existencias, precios de compra y registra nuevas entradas de insumos.
              </span>
              <Button variant="outline-secondary" size="sm" onClick={loadProducts} disabled={loading}>
                {loading ? <Spinner size="sm" animation="border" className="me-1" /> : <FiRefreshCw className="me-1" />}
                Actualizar
              </Button>
            </div>

            <Card className="shadow-sm border-0">
              <Card.Body className="p-0">
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted mb-0 small">Cargando inventario...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted mb-0">No hay productos registrados en el inventario.</p>
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
              </Card.Body>
            </Card>
          </>
        )}

        {/* Tab 2: Proyecciones a 7 Días */}
        {activeTab === 'projections' && (
          <>
            <Alert variant="info" className="py-2 px-3 mb-3 small d-flex align-items-center gap-2">
              <FiPackage size={18} className="flex-shrink-0" />
              <div>
                <strong>Proyección de Demanda Semanal (7 días):</strong> Cruza las citas agendadas de la semana con
                la receta de cada servicio para predecir si el stock alcanzará o cuándo se agotará.
              </div>
            </Alert>

            <div className="d-flex justify-content-end mb-3">
              <Button variant="outline-secondary" size="sm" onClick={loadProjections} disabled={loadingProjections}>
                {loadingProjections ? <Spinner size="sm" animation="border" className="me-1" /> : <FiRefreshCw className="me-1" />}
                Recalcular Proyecciones
              </Button>
            </div>

            <Card className="shadow-sm border-0">
              <Card.Body className="p-0">
                {loadingProjections ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted mb-0 small">Calculando proyección de citas y demanda...</p>
                  </div>
                ) : projections.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted mb-0">No hay productos para proyectar.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="mb-0 align-middle" style={{ fontSize: '0.88rem' }}>
                      <thead className="table-light">
                        <tr>
                          <th>Insumo / Producto</th>
                          <th>Stock Actual</th>
                          <th>Demanda (7 Días)</th>
                          <th>Balance Proyectado</th>
                          <th>Servicios Restantes</th>
                          <th>Sugerencia de Compra</th>
                          <th className="text-end">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projections.map((proj) => {
                          const isCritical = proj.status === 'CRITICO_7_DIAS' || proj.status === 'SIN_STOCK';
                          const isLow = proj.status === 'BAJO';

                          return (
                            <tr key={proj.productId}>
                              <td>
                                <div className="fw-bold text-dark">{proj.productName}</div>
                                <small className="text-muted">
                                  {proj.appointmentsNext7Days > 0
                                    ? `Usado en ${proj.appointmentsNext7Days} cita(s) esta semana`
                                    : 'Sin citas agendadas con este insumo'}
                                </small>
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    proj.currentStockConsumptionUnit < 0
                                      ? 'bg-danger'
                                      : proj.currentStockConsumptionUnit === 0
                                      ? 'bg-warning text-dark'
                                      : 'bg-success'
                                  }`}
                                  style={{ fontSize: '0.8rem' }}
                                >
                                  {proj.currentStockConsumptionUnit} {proj.consumptionUnit}
                                </span>
                              </td>
                              <td>
                                <span className="fw-semibold text-dark">
                                  {proj.projectedDemand7Days} {proj.consumptionUnit}
                                </span>
                              </td>
                              <td>
                                {proj.balanceAfter7Days < 0 ? (
                                  <Badge bg="danger" className="d-inline-flex align-items-center gap-1">
                                    <FiAlertTriangle /> Falta {Math.abs(proj.balanceAfter7Days).toFixed(1)}{' '}
                                    {proj.consumptionUnit}
                                  </Badge>
                                ) : (
                                  <Badge bg="success">
                                    {proj.balanceAfter7Days.toFixed(1)} {proj.consumptionUnit} sobrantes
                                  </Badge>
                                )}
                              </td>
                              <td>
                                <span className="fw-semibold text-dark">
                                  ~{proj.servicesRemainingWithStock} atenciones
                                </span>
                              </td>
                              <td>
                                {proj.suggestedPurchaseQuantity > 0 ? (
                                  <div>
                                    <span className="fw-bold text-danger">
                                      Comprar {proj.suggestedPurchaseQuantity} {proj.purchaseUnit}(s)
                                    </span>
                                    <small className="text-muted d-block">
                                      Est. {formatCurrencyCLP(proj.estimatedRestockCost)}
                                    </small>
                                  </div>
                                ) : (
                                  <span className="text-success small fw-semibold">
                                    <FiCheckCircle className="me-1" /> Stock suficiente
                                  </span>
                                )}
                              </td>
                              <td className="text-end">
                                <Button
                                  variant={isCritical ? 'danger' : isLow ? 'warning' : 'outline-success'}
                                  size="sm"
                                  className="d-inline-flex align-items-center gap-1"
                                  onClick={() => handlePurchaseSuggested(proj)}
                                >
                                  <FiShoppingBag size={13} />
                                  {proj.suggestedPurchaseQuantity > 0 ? 'Comprar' : 'Reabastecer'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </>
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
