import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Product, ProductFormData } from '@/types/inventory.types';
import { inventoryApi } from '@/api/inventory.api';
import { toast } from 'react-toastify';
import { Modal, Button } from '@/components/ui';

interface Props {
  show: boolean;
  onHide: () => void;
  onSaved?: (product: Product) => void;
  productToEdit?: Product | null;
}

export const ProductFormModal: React.FC<Props> = ({ show, onHide, onSaved, productToEdit }) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    defaultValues: {
      name: '',
      purchasePrice: 0,
      purchaseUrl: '',
      purchaseUnit: 'Unidad',
      consumptionUnit: 'unidad',
      conversionFactor: 1,
      stockConsumptionUnit: 0,
    },
  });
  const [isImporting, setIsImporting] = useState(false);

  const normalizeUrl = (v?: string | null) => {
    if (!v) return v;
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    return `https://${v}`;
  };

  useEffect(() => {
    if (productToEdit) {
      setValue('name', productToEdit.name);
      setValue('purchasePrice', productToEdit.purchasePrice);
      setValue('purchaseUrl', normalizeUrl(productToEdit.purchaseUrl) || '');
      setValue('purchaseUnit', productToEdit.purchaseUnit);
      setValue('consumptionUnit', productToEdit.consumptionUnit);
      setValue('conversionFactor', productToEdit.conversionFactor);
      setValue('stockConsumptionUnit', productToEdit.stockConsumptionUnit);
    } else {
      reset();
    }
  }, [productToEdit, setValue, reset]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      const payload: ProductFormData = {
        name: data.name.trim(),
        purchasePrice: Number(data.purchasePrice),
        purchaseUrl: data.purchaseUrl ? normalizeUrl(data.purchaseUrl.trim()) : undefined,
        purchaseUnit: data.purchaseUnit.trim(),
        consumptionUnit: data.consumptionUnit.trim(),
        conversionFactor: Number(data.conversionFactor),
        stockConsumptionUnit: Number(data.stockConsumptionUnit),
      };

      let saved: Product;
      if (productToEdit) {
        saved = await inventoryApi.updateProduct(productToEdit.id, payload);
        toast.success('Producto actualizado');
      } else {
        saved = await inventoryApi.createProduct(payload);
        toast.success('Producto creado');
      }
      onSaved?.(saved);
      onHide();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = error?.response?.data?.error?.message ?? error?.message ?? 'Error al guardar producto';
      toast.error(msg);
    }
  };

  const handleImportFromUrl = async () => {
    const rawUrl = (document.querySelector('input[name="purchaseUrl"]') as HTMLInputElement)?.value;
    if (!rawUrl) {
      toast.error('Ingresa una URL antes de importar');
      return;
    }
    const normalized = normalizeUrl(rawUrl);
    setIsImporting(true);
    try {
      const imported = await inventoryApi.importProductFromUrl(normalized!);
      if (imported.name) setValue('name', imported.name, { shouldDirty: true });
      if (imported.purchasePrice) setValue('purchasePrice', Number(imported.purchasePrice), { shouldDirty: true });
      if (imported.suggestedPurchaseUnit) setValue('purchaseUnit', imported.suggestedPurchaseUnit, { shouldDirty: true });
      if (imported.suggestedConsumptionUnit) setValue('consumptionUnit', imported.suggestedConsumptionUnit, { shouldDirty: true });
      if (imported.suggestedConversionFactor !== null && imported.suggestedConversionFactor !== undefined) {
        setValue('conversionFactor', Number(imported.suggestedConversionFactor), { shouldDirty: true });
      }

      if (imported.observedAvailable === false) {
        toast.warning('Producto importado, pero aparece como sin stock en el proveedor');
      } else {
        toast.success('Datos importados desde el link');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = error?.response?.data?.error?.message ?? error?.message ?? 'No se pudo importar desde el link';
      toast.error(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const isValidUrl = (v: unknown) => {
    if (v === undefined || v === null || v === '') return true;
    if (typeof v !== 'string') return false;
    try {
      const normalized = v.startsWith('http://') || v.startsWith('https://') ? v : `https://${v}`;
      new URL(normalized);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="md" centered>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton>
          <Modal.Title>{productToEdit ? '✏️ Editar Producto' : '📦 Nuevo Producto'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-bunny-text-muted uppercase block mb-1">
              Nombre *
            </label>
            <input
              className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/30"
              {...register('name', { required: true })}
            />
            {errors.name && <small className="text-xs text-bunny-danger font-medium mt-1 block">Nombre es requerido</small>}
          </div>

          <div>
            <label className="text-xs font-semibold text-bunny-text-muted uppercase block mb-1">
              Precio de compra (por unidad de compra)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm text-bunny-text-muted">$</span>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-xl border border-bunny-border bg-white pl-8 pr-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/30"
                {...register('purchasePrice', { valueAsNumber: true, min: 0 })}
                aria-label="Precio de compra"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-bunny-text-muted uppercase block mb-1">
              URL del proveedor
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                className="flex-1 rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/30"
                {...register('purchaseUrl', {
                  validate: (v) => v === undefined || v === null || v === '' || isValidUrl(v),
                })}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleImportFromUrl}
                disabled={isImporting}
              >
                {isImporting ? 'Importando...' : 'Importar'}
              </Button>
            </div>
            {errors.purchaseUrl && <small className="text-xs text-bunny-danger font-medium mt-1 block">La URL no es válida</small>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-bunny-text-muted uppercase block mb-1">
                Unidad de compra *
              </label>
              <input
                className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/30"
                {...register('purchaseUnit', { required: true })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-bunny-text-muted uppercase block mb-1">
                Unidad de consumo *
              </label>
              <input
                className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/30"
                {...register('consumptionUnit', { required: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-bunny-text-muted uppercase block mb-1">
                Factor de conversión
              </label>
              <input
                type="number"
                step="0.0001"
                className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/30"
                {...register('conversionFactor', { valueAsNumber: true, min: 0.0001 })}
              />
              <small className="text-[11px] text-bunny-text-muted block mt-1">
                Consumo por unidad de compra
              </small>
            </div>
            <div>
              <label className="text-xs font-semibold text-bunny-text-muted uppercase block mb-1">
                Stock (unidad de consumo)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/30"
                {...register('stockConsumptionUnit', { valueAsNumber: true })}
              />
            </div>
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
            loadingText={productToEdit ? 'Guardando...' : 'Creando...'}
          >
            {productToEdit ? 'Guardar' : 'Crear'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default ProductFormModal;
