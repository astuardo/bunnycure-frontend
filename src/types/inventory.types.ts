export interface Product {
  id: number;
  name: string;
  purchasePrice: number; // price per purchase unit
  purchaseUrl?: string | null;
  observedPrice?: number | null;
  observedAvailable?: boolean | null;
  lastObservedAt?: string | null;
  purchaseUnit: string; // e.g., "Botella", "Caja"
  consumptionUnit: string; // e.g., "ml", "unidad"
  conversionFactor: number; // how many consumption units in one purchase unit
  stockConsumptionUnit: number; // current stock expressed in consumption unit
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFormData {
  name: string;
  purchasePrice: number;
  purchaseUrl?: string | null;
  purchaseUnit: string;
  consumptionUnit: string;
  conversionFactor: number;
  stockConsumptionUnit: number;
}

export interface MaterialUsage {
  productId: number;
  quantity: number;
}

export interface ConsumeRequest {
  serviceId: number;
  usages: MaterialUsage[];
  usedByUserId?: number;
}

export interface PurchaseRequest {
  productId: number;
  purchaseQuantity: number; // in purchase units
  unitPurchasePrice: number;
  reference?: string | null;
  createdBy?: number | null;
}

export interface InventoryMovement {
  id: number;
  productId: number;
  movementType: 'PURCHASE' | 'CONSUMPTION' | 'ADJUSTMENT';
  quantityConsumptionUnit: number;
  quantityPurchaseUnit?: number | null;
  unitPurchasePrice?: number | null;
  reference?: string | null;
  createdBy?: number | null;
  createdAt?: string | null;
}
