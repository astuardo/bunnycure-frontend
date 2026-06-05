import React, { useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { PurchaseRequest, Product } from '@/types/inventory.types';
import { inventoryApi } from '@/api/inventory.api';
import { toast } from 'react-toastify';

interface Props {
  show: boolean;
  onHide: () => void;
  product?: Product | null;
  onPurchased?: () => void; // callback to refresh list
}

export const PurchaseFormModal: React.FC<Props> = ({ show, onHide, product, onPurchased }) => {
  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<PurchaseRequest>({
    defaultValues: {
      productId: product?.id ?? 0,
      purchaseQuantity: 1,
      unitPurchasePrice: 0,
      reference: ''
    }
  });

  useEffect(() => {
    if (product) {
      setValue('productId', product.id);
    } else {
      reset();
    }
  }, [product, setValue, reset]);

  const onSubmit = async (data: PurchaseRequest) => {
    try {
      await inventoryApi.registerPurchase(data);
      toast.success('Compra registrada y stock actualizado');
      onPurchased && onPurchased();
      onHide();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err?.message ?? 'Error al registrar compra';
      toast.error(msg);
    }
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={onHide} centered>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton>
          <Modal.Title>Registrar compra</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-2">
            <label className="form-label">Producto</label>
            <input className="form-control" value={product?.name ?? ''} disabled />
          </div>

          <div className="mb-3">
            <label className="form-label">Cantidad (unidad de compra: {product?.purchaseUnit ?? ''})</label>
            <input type="number" step="0.01" className="form-control" {...register('purchaseQuantity', { valueAsNumber: true, min: 0.0001 })} defaultValue={1} required />
          </div>

          <div className="mb-3">
            <label className="form-label">Precio por unidad de compra</label>
            <div className="input-group">
              <span className="input-group-text" aria-hidden>$</span>
              <input type="number" step="0.01" className="form-control" {...register('unitPurchasePrice', { valueAsNumber: true, min: 0 })} aria-label="Precio por unidad" required />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Referencia / Nota</label>
            <input className="form-control" {...register('reference')} />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-secondary" onClick={onHide}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Registrar compra</button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default PurchaseFormModal;
