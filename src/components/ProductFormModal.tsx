import React, { useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { Product, ProductFormData } from '@/types/inventory.types';
import { inventoryApi } from '@/api/inventory.api';
import { toast } from 'react-toastify';

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
    formState: { errors, isSubmitting }
  } = useForm<ProductFormData>({
    defaultValues: {
      name: '',
      purchasePrice: 0,
      purchaseUrl: '',
      purchaseUnit: 'Unidad',
      consumptionUnit: 'unidad',
      conversionFactor: 1,
      stockConsumptionUnit: 0
    }
  });

  // Helper to normalize URLs by adding https:// when protocol is missing
  const normalizeUrl = (v?: string | null) => {
    if (!v) return v;
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    return `https://${v}`;
  };

  useEffect(() => {
    if (productToEdit) {
      setValue('name', productToEdit.name);
      setValue('purchasePrice', productToEdit.purchasePrice);
      // normalize displayed URL so the form shows the protocol-prefixed value
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
      // Auto-complete purchaseUrl: add https:// if missing
      const normalizeUrl = (v?: string | null) => {
        if (!v) return v;
        if (v.startsWith('http://') || v.startsWith('https://')) return v;
        return `https://${v}`;
      };

      const payload: ProductFormData = {
        ...data,
        purchaseUrl: normalizeUrl(data.purchaseUrl),
      };

      if (productToEdit) {
        const updated = await inventoryApi.updateProduct(productToEdit.id, payload);
        // update form to show normalized url returned by backend before closing
        setValue('purchaseUrl', updated.purchaseUrl || '');
        toast.success('Producto actualizado');
        onSaved && onSaved(updated);
      } else {
        const created = await inventoryApi.createProduct(payload);
        setValue('purchaseUrl', created.purchaseUrl || '');
        toast.success('Producto creado');
        onSaved && onSaved(created);
      }

      // small delay to let user see normalized url briefly (optional)
      // await new Promise(res => setTimeout(res, 120));

      onHide();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err?.message ?? 'Error';
      toast.error(msg);
    }
  };

  // URL validator helper
  const isValidUrl = (v: any) => {
    if (v === undefined || v === null || v === '') return true;
    if (typeof v !== 'string') return false;
    try {
      // Ensure it has protocol; allow users to input without protocol by trying to add https://
      const normalized = v.startsWith('http://') || v.startsWith('https://') ? v : `https://${v}`;
      // eslint-disable-next-line no-new
      new URL(normalized);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton>
          <Modal.Title>{productToEdit ? 'Editar producto' : 'Nuevo producto'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label">Nombre</label>
            <input className="form-control" {...register('name', { required: true })} />
            {errors.name && <small className="text-danger">Nombre es requerido</small>}
          </div>

          <div className="mb-3">
            <label className="form-label">Precio de compra (por unidad de compra)</label>
            <div className="input-group">
              <span className="input-group-text" aria-hidden>$</span>
              <input type="number" step="0.01" className="form-control" {...register('purchasePrice', { valueAsNumber: true, min: 0 })} aria-label="Precio de compra" />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">URL del proveedor</label>
            <input type="url" className="form-control" {...register('purchaseUrl', { validate: (v) => (v === undefined || v === null || v === '') || isValidUrl(v) })} />
            {errors.purchaseUrl && <small className="text-danger">La URL no es válida</small>}
          </div>

          {/* Helper: URL validator */}
          {/* Note: isValidUrl is defined below via a local function */}

          <div className="row">
            <div className="col-6 mb-3">
              <label className="form-label">Unidad de compra</label>
              <input className="form-control" {...register('purchaseUnit', { required: true })} />
            </div>
            <div className="col-6 mb-3">
              <label className="form-label">Unidad de consumo</label>
              <input className="form-control" {...register('consumptionUnit', { required: true })} />
            </div>
          </div>

          <div className="row">
            <div className="col-6 mb-3">
              <label className="form-label">Factor de conversión</label>
              <input type="number" step="0.0001" className="form-control" {...register('conversionFactor', { valueAsNumber: true, min: 0.0001 })} />
              <small className="text-muted">Cuántas unidades de consumo hay en 1 unidad de compra</small>
            </div>
            <div className="col-6 mb-3">
              <label className="form-label">Stock (unidad de consumo)</label>
              <input type="number" step="0.01" className="form-control" {...register('stockConsumptionUnit', { valueAsNumber: true })} />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-secondary" onClick={onHide}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{productToEdit ? 'Guardar' : 'Crear'}</button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default ProductFormModal;
