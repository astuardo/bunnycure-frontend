import React from 'react';
import { Product } from '@/types/inventory.types';
import { formatCurrencyCLP } from '@/utils/formatters';

interface Props {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onPurchase: (p: Product) => void;
  onViewMovements: (p: Product) => void;
}

export const ProductList: React.FC<Props> = ({ products, onEdit, onDelete, onPurchase, onViewMovements }) => {
  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Precio compra</th>
            <th>Unidad compra</th>
            <th>Unidad consumo</th>
            <th>Factor</th>
            <th>Stock (consumo)</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center text-muted">No hay productos</td>
            </tr>
          )}

          {products.map((p) => (
            <tr key={p.id}>
              <td>
                {p.name}
                {p.purchaseUrl && (
                  <a href={p.purchaseUrl} target="_blank" rel="noopener noreferrer" className="ms-2" title="Ir al proveedor">
                    🔗
                  </a>
                )}
              </td>
              <td>{formatCurrencyCLP(p.purchasePrice)}</td>
              <td>{p.purchaseUnit}</td>
              <td>{p.consumptionUnit}</td>
              <td>{p.conversionFactor}</td>
              <td>{p.stockConsumptionUnit}</td>
              <td>
                <div className="btn-group" role="group">
                  <button className="btn btn-sm btn-outline-success" onClick={() => onPurchase(p)}>Registrar compra</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => onViewMovements(p)}>Movimientos</button>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => onEdit(p)}>Editar</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(p)}>Eliminar</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;
