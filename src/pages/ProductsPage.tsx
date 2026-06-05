import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import DashboardLayout from '@/components/common/DashboardLayout';
import { inventoryApi } from '@/api/inventory.api';
import { Product } from '@/types/inventory.types';
import ProductList from '@/components/ProductList';
import ProductFormModal from '@/components/ProductFormModal';
import PurchaseFormModal from '@/components/PurchaseFormModal';
import MovementListModal from '@/components/MovementListModal';
import { toast } from 'react-toastify';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [purchaseProduct, setPurchaseProduct] = useState<Product | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [movementsProductId, setMovementsProductId] = useState<number | null>(null);
  const [showMovementsModal, setShowMovementsModal] = useState(false);

  const load = async () => {
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

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    const observed = products.filter((p) => p.lastObservedAt).length;
    const available = products.filter((p) => p.observedAvailable === true).length;
    return { total: products.length, observed, available };
  }, [products]);

  const handleSaved = (product: Product) => {
    setProducts((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      return exists ? prev.map((item) => (item.id === product.id ? product : item)) : [product, ...prev];
    });
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Eliminar producto "${product.name}"?`)) return;
    try {
      await inventoryApi.deleteProduct(product.id);
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      toast.success('Producto eliminado');
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || error?.message || 'Error al eliminar';
      toast.error(msg);
    }
  };

  const handleRefreshObserved = async (product: Product) => {
    try {
      const updated = await inventoryApi.refreshObservedPrice(product.id);
      handleSaved(updated);
      toast.success(`Precio observado actualizado: ${product.name}`);
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || error?.message || 'No se pudo actualizar';
      toast.error(msg);
    }
  };

  return (
    <DashboardLayout>
      <div className="bunny-page">
        <Row className="mb-3 mb-md-4">
          <Col>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
              <div>
                <h1 className="mb-1">📦 Inventario</h1>
                <p className="text-muted mb-0 small">
                  Administra productos, stock, precio observado y compras
                </p>
              </div>
              <Button variant="primary" size="lg" onClick={() => setShowFormModal(true)} className="w-100 w-md-auto">
                ➕ Nuevo producto
              </Button>
            </div>
          </Col>
        </Row>

        <Row className="g-3 mb-3 mb-md-4">
          <Col md={4}>
            <Card className="h-100">
              <Card.Body>
                <div className="text-muted small">Productos</div>
                <div className="fs-3 fw-bold">{summary.total}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100">
              <Card.Body>
                <div className="text-muted small">Con observación</div>
                <div className="fs-3 fw-bold">{summary.observed}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100">
              <Card.Body>
                <div className="text-muted small">Disponibles</div>
                <div className="fs-3 fw-bold">{summary.available}</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col>
            <Alert variant="info" className="mb-0">
              El precio observado se refresca diariamente desde la URL de compra y se guarda como último valor conocido.
            </Alert>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col className="d-flex justify-content-end">
            <Button variant="outline-secondary" onClick={load} disabled={loading}>
              {loading ? <Spinner size="sm" animation="border" className="me-2" /> : '↻'}
              Recargar
            </Button>
          </Col>
        </Row>

        <Row>
          <Col>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Lista de productos</h5>
                <Badge bg="secondary">{products.length} productos</Badge>
              </Card.Header>
              <Card.Body className="p-0">
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" />
                    <p className="mt-2 text-muted mb-0">Cargando inventario...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted mb-0">No hay productos registrados</p>
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
                  />
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

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
          onPurchased={load}
        />

        <MovementListModal
          show={showMovementsModal}
          onHide={() => {
            setShowMovementsModal(false);
            setMovementsProductId(null);
          }}
          productId={movementsProductId}
        />
      </div>
    </DashboardLayout>
  );
}
