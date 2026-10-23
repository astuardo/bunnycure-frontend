import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { PurchaseRequest, Product } from '@/types/inventory.types';
import { inventoryApi } from '@/api/inventory.api';
import { useToast } from '@/hooks/useToast';
import { formatCurrencyCLP } from '@/utils/formatters';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
import { Modal, Button, Badge } from '@/components/ui';

interface Props {
  show: boolean;
  onHide: () => void;
  product?: Product | null;
  onPurchased?: () => void;
}

export const PurchaseFormModal: React.FC<Props> = ({ show, onHide, product, onPurchased }) => {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<PurchaseRequest>({
    defaultValues: {
      productId: product?.id ?? 0,
      purchaseQuantity: 1,
      unitPurchasePrice: product?.purchasePrice ?? 0,
      reference: '',
    },
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
      onPurchased?.();
      onHide();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = error?.response?.data?.error?.message ?? error?.message ?? 'Error al registrar compra';
      toast.error(msg);
    }
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={onHide} size="md" centered>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton>
          <Modal.Title>🛒 Registrar Compra / Entrada de Stock</Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <div>
            <label htmlFor="purchase-form-producto" className="text-xs font-semibold text-bunny-text-muted uppercase block mb-1">
              Producto
            </label>
            <input id="purchase-form-producto"
              className="w-full rounded-xl border border-bunny-border bg-bunny-paper/50 px-3.5 py-2 text-sm font-semibold text-bunny-cocoa cursor-not-allowed"
              value={product?.name ?? ''}
              disabled
            />
            <small className="text-xs text-bunny-text-muted block mt-1">
              Stock actual: <strong className="text-bunny-cocoa">{product?.stockConsumptionUnit} {product?.consumptionUnit}</strong>
            </small>
          </div>

          <div>
            <label htmlFor="purchase-form-cantidad-a-comprar-en" className="text-xs font-semibold text-bunny-cocoa uppercase block mb-1">
              Cantidad a Comprar (en {product?.purchaseUnit ?? 'unidades de compra'})
            </label>
            <input id="purchase-form-cantidad-a-comprar-en"
              type="number"
              step="0.01"
              className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/30"
              {...register('purchaseQuantity', { valueAsNumber: true, min: 0.0001 })}
              defaultValue={1}
              required
            />
            {product?.conversionFactor && (
              <small className="text-xs text-bunny-text-muted block mt-1">
                Equivale a: <strong className="text-bunny-cocoa">{(enteredQty * product.conversionFactor).toFixed(1)} {product.consumptionUnit}</strong> agregados al inventario.
              </small>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="purchase-form-precio-unitario-de-compra" className="text-xs font-semibold text-bunny-cocoa uppercase block">
                Precio Unitario de Compra (por {product?.purchaseUnit ?? 'unidad'})
              </label>
              {oldPrice > 0 && enteredPrice > 0 && (
                <div>
                  {priceDelta > 0 ? (
                    <Badge variant="danger" className="gap-1 inline-flex items-center text-[10px]">
                      <FiTrendingUp /> +{variationPct.toFixed(1)}% Más Caro
                    </Badge>
                  ) : priceDelta < 0 ? (
                    <Badge variant="success" className="gap-1 inline-flex items-center text-[10px]">
                      <FiTrendingDown /> {variationPct.toFixed(1)}% Más Barato
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="gap-1 inline-flex items-center text-[10px]">
                      <FiMinus /> Mismo Precio
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm text-bunny-text-muted">$</span>
              <input id="purchase-form-precio-unitario-de-compra"
                type="number"
                step="0.01"
                className="w-full rounded-xl border border-bunny-border bg-white pl-8 pr-3.5 py-2 text-sm font-semibold text-bunny-cocoa focus:outline-none focus:ring-2 focus:ring-bunny-primary/30"
                {...register('unitPurchasePrice', { valueAsNumber: true, min: 0 })}
                required
              />
            </div>
            {oldPrice > 0 && (
              <small className="text-xs text-bunny-text-muted block mt-1">
                Último precio de compra registrado: <strong className="text-bunny-cocoa">{formatCurrencyCLP(oldPrice)}</strong>
              </small>
            )}
          </div>

          {/* Total calculado */}
          <div className="rounded-xl border border-bunny-border bg-bunny-paper/60 p-3.5 flex justify-between items-center">
            <span className="text-xs text-bunny-text-muted font-medium">
              Total a Pagar por esta Compra:
            </span>
            <span className="text-base font-bold text-bunny-primary-dark">
              {formatCurrencyCLP(Math.round(totalAmount))}
            </span>
          </div>

          <div>
            <label htmlFor="purchase-form-proveedor-referencia-factura" className="text-xs font-semibold text-bunny-text-muted uppercase block mb-1">
              Proveedor / Referencia / Factura
            </label>
            <input id="purchase-form-proveedor-referencia-factura"
              className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/30"
              placeholder="Ej: Distribuidora Nails, Factura #1234"
              {...register('reference')}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" size="sm" onClick={onHide} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            loadingText="Guardando..."
          >
            Registrar Compra
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default PurchaseFormModal;
