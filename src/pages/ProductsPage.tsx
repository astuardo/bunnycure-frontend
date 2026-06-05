import React, { useEffect, useState } from 'react';
import { inventoryApi } from '@/api/inventory.api';
import { Product } from '@/types/inventory.types';
import ProductList from '@/components/ProductList';
import ProductFormModal from '@/components/ProductFormModal';
import PurchaseFormModal from '@/components/PurchaseFormModal';
import MovementListModal from '@/components/MovementListModal';
import { toast } from 'react-toastify';

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [purchaseProduct, setPurchaseProduct] = useState<Product | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [movementsProductId, setMovementsProductId] = useState<number | null>(null);
  const [showMovementsModal, setShowMovementsModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.listProducts();
      setProducts(data);
    } catch (err: any) {
      toast.error('No se pudo cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const handleSaved = (p: Product) => {
    // actualizar lista local
    setProducts(prev => {
      const exists = prev.find(x => x.id === p.id);
      if (exists) return prev.map(x => x.id === p.id ? p : x);
      return [p, ...prev];
    });
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setShowModal(true);
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Eliminar producto "${p.name}"?`)) return;
    try {
      await inventoryApi.deleteProduct(p.id);
      setProducts(prev => prev.filter(x => x.id !== p.id));
      toast.success('Producto eliminado');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err?.message ?? 'Error';
      toast.error(msg);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Administración de Productos</h3>
        <div>
          <button className="btn btn-primary" onClick={handleCreate}>+ Nuevo producto</button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <ProductList 
          products={products} 
          onEdit={handleEdit} 
          onDelete={handleDelete}
          onPurchase={(p) => { setPurchaseProduct(p); setShowPurchaseModal(true); }}
          onViewMovements={(p) => { setMovementsProductId(p.id); setShowMovementsModal(true); }}
        />
      )}

      <ProductFormModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSaved={handleSaved}
        productToEdit={editing}
      />

      <PurchaseFormModal
        show={showPurchaseModal}
        onHide={() => { setShowPurchaseModal(false); setPurchaseProduct(null); }}
        product={purchaseProduct}
        onPurchased={() => { load(); }}
      />

      <MovementListModal
        show={showMovementsModal}
        onHide={() => { setShowMovementsModal(false); setMovementsProductId(null); }}
        productId={movementsProductId}
      />
    </div>
  );
};

export default ProductsPage;
