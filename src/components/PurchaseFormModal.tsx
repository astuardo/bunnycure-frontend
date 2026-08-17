import React, { useEffect } from 'react';
import { Modal, Badge } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { PurchaseRequest, Product } from '@/types/inventory.types';
import { inventoryApi } from '@/api/inventory.api';
import { useToast } from '@/hooks/useToast';
import { formatCurrencyCLP } from '@/utils/formatters';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';

interface Props {
  show: boolean;
  onHide: () => void;
  product?: Product | null;
  onPurchased?: () => void;
}

export const PurchaseFormModal: React.FC<Props> = ({ show, onHide, product, onPurchased }) => {
  const toast = useToast();
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<PurchaseRequest>({
    defaultValues: {
      productId: product?.id ?? 0,
      purchaseQuantity: 1,
      unitPurchasePrice: product?.purchasePrice ?? 0,
      reference: ''
    }
  });

  const enteredPrice = watch('unitPurchasePrice') || 0;
  const enteredQty = watch('purchaseQuantity') || 1;

  useEffect(() => {
    if (product) {
      setValue('productId', product.id);
      setValue('unitPurchasePrice', product.purchasePrice || 0);
    } else {
      reset();
    }
  }, [product, setValue, reset]);

  const oldPrice = product?.purchasePrice || 0;
  const priceDelta = enteredPrice - oldPrice;
  const variationPct = oldPrice > 0 ? (priceDelta / oldPrice) * 100 : 0;
  const totalAmount = enteredPrice * enteredQty;

  const onSubmit = async (data: PurchaseRequest) => {
    try {
      await inventoryApi.registerPurchase(data);
      toast.success('✅ Compra registrada y stock actualizado');
      onPurchased && onPurchased();
      onHide();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = error?.response?.data?.error?.message ?? error?.message ?? 'Error al registrar compra';
      toast.error(msg);
    }
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={onHide} centered>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton style={{ background: '#fdf4f2', borderBottom: '1px solid #eed0c5' }}>
          <Modal.Title style={{ color: '#422314', fontSize: '1.15rem', fontWeight: 700 }}>
            🛒 Registrar Compra / Entrada de Stock
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <div className="mb-3">
            <label className="form-label text-muted small mb-1">Producto</label>
            <input className="form-control fw-bold bg-light" value={product?.name ?? ''} disabled />
            <small className="text-muted d-block mt-1">
              Stock actual: <strong>{product?.stockConsumptionUnit} {product?.consumptionUnit}</strong>
            </small>
          </div>

          <div className="mb-3">
            <label className="form-label text-dark fw-semibold small mb-1">
              Cantidad a Comprar (en {product?.purchaseUnit ?? 'unidades de compra'})
            </label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              {...register('purchaseQuantity', { valueAsNumber: true, min: 0.0001 })}
              defaultValue={1}
              required
            />
            {product?.conversionFactor && (
              <small className="text-muted d-block mt-1">
                Equivale a: <strong>{(enteredQty * product.conversionFactor).toFixed(1)} {product.consumptionUnit}</strong> agregados al inventario.
              </small>
            )}
          </div>

          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label text-dark fw-semibold small mb-0">
                Precio Unitario de Compra (por {product?.purchaseUnit ?? 'unidad'})
              </label>
              {oldPrice > 0 && enteredPrice > 0 && (
                <div>
                  {priceDelta > 0 ? (
                    <Badge bg="danger" className="d-inline-flex align-items-center gap-1">
                      <FiTrendingUp /> +{variationPct.toFixed(1)}% Más Caro
                    </Badge>
                  ) : priceDelta < 0 ? (
                    <Badge bg="success" className="d-inline-flex align-items-center gap-1">
                      <FiTrendingDown /> {variationPct.toFixed(1)}% Más Barato
                    </Badge>
                  ) : (
                    <Badge bg="secondary" className="d-inline-flex align-items-center gap-1">
                      <FiMinus /> Mismo Precio
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="input-group">
              <span className="input-group-text">$</span>
              <input
                type="number"
                step="0.01"
                className="form-control fw-bold"
                {...register('unitPurchasePrice', { valueAsNumber: true, min: 0 })}
                required
              />
            </div>
            {oldPrice > 0 && (
              <small className="text-muted d-block mt-1">
                Último precio de compra registrado: <strong>{formatCurrencyCLP(oldPrice)}</strong>
              </small>
            )}
          </div>

          {/* Total calculado */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span className="text-muted small">Total a Pagar por esta Compra:</span>
            <span className="fw-bold fs-6 text-dark">{formatCurrencyCLP(Math.round(totalAmount))}</span>
          </div>

          <div className="mb-2">
            <label className="form-label text-muted small mb-1">Proveedor / Referencia / Factura</label>
            <input
              className="form-control"
              placeholder="Ej: Distribuidora Nails, Factura #1234"
              {...register('reference')}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-secondary" onClick={onHide}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Registrar Compra'}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default PurchaseFormModal;

