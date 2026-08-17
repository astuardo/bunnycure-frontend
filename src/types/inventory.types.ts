export interface Product {
  id: number;
  name: string;
  purchasePrice: number; // price per purchase unit
  purchaseUrl?: string | null;
  observedPrice?: number | null;
  previousObservedPrice?: number | null;
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

export interface ProductImportPreview {
  name?: string | null;
  purchaseUrl: string;
  purchasePrice?: number | null;
  observedPrice?: number | null;
  observedAvailable?: boolean | null;
  suggestedPurchaseUnit?: string | null;
  suggestedConsumptionUnit?: string | null;
  suggestedConversionFactor?: number | null;
}

// ─── Recetas / Insumos de Servicios ──────────────────────────────────────────

export interface ServiceSupply {
  id?: number;
  serviceId?: number;
  productId: number;
  productName?: string;
  purchaseUnit?: string;
  consumptionUnit?: string;
  conversionFactor?: number;
  quantityConsumptionUnit: number;
  productPurchasePrice?: number;
  unitConsumptionCost?: number;
  totalEstimatedCost?: number;
  currentStock?: number;
}

export interface ServiceSupplyFormData {
  id?: number;
  productId: number;
  quantityConsumptionUnit: number;
}

export interface ServiceCostSummary {
  serviceId: number;
  serviceName: string;
  servicePrice: number;
  totalMaterialsCost: number;
  grossMargin: number;
  grossMarginPercentage: number;
  supplies: ServiceSupply[];
}

// ─── Análisis de Precios de Compra ───────────────────────────────────────────

export interface PurchaseHistoryEntry {
  movementId: number;
  purchaseQuantity: number;
  purchaseUnit: string;
  unitPurchasePrice: number;
  totalPaid: number;
  reference?: string | null;
  purchaseDate: string;
  variationFromPrevious: number; // in percentage e.g. +12.5 or -5.0
}

export interface ProductPriceAnalysis {
  productId: number;
  productName: string;
  lastPurchasePrice: number;
  previousPurchasePrice?: number | null;
  priceDelta: number;
  priceVariationPercentage: number;
  trend: 'UP' | 'DOWN' | 'EQUAL' | 'INITIAL';
  averagePurchasePrice: number;
  minPurchasePrice: number;
  maxPurchasePrice: number;
  totalPurchasesCount: number;
  purchaseHistory: PurchaseHistoryEntry[];
}

// ─── Proyección de Stock a 7 Días ─────────────────────────────────────────────

export interface StockProjection {
  productId: number;
  productName: string;
  purchaseUnit: string;
  consumptionUnit: string;
  conversionFactor: number;
  currentStockConsumptionUnit: number;
  projectedDemand7Days: number;
  balanceAfter7Days: number;
  appointmentsNext7Days: number;
  servicesRemainingWithStock: number;
  suggestedPurchaseQuantity: number;
  estimatedRestockCost: number;
  status: 'OK' | 'BAJO' | 'CRITICO_7_DIAS' | 'SIN_STOCK';
}

// ─── Previsualización y Deducción en Citas ───────────────────────────────────

export interface AppointmentSupplyItem {
  productId: number;
  productName: string;
  consumptionUnit: string;
  suggestedQuantity: number;
  currentStock: number;
  projectedStockAfter: number;
  unitConsumptionCost: number;
  estimatedCost: number;
}

export interface AppointmentSuppliesPreview {
  appointmentId: number;
  customerId?: number | null;
  customerName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceNames: string[];
  autoConsumptionEnabled: boolean;
  supplies: AppointmentSupplyItem[];
}

export interface CompleteAppointmentWithSuppliesPayload {
  appointmentId: number;
  generateInvoice?: boolean;
  deductSupplies?: boolean;
  supplies: {
    productId: number;
    quantity: number;
  }[];
}

