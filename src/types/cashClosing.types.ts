/**
 * Tipos para Cierre de Caja Contable y Financiero (Diario y Mensual)
 */

export type CashClosingPeriodType = 'DAILY' | 'MONTHLY';

export interface CashClosingTransaction {
  appointmentId: number;
  appointmentDate: string;
  appointmentTime: string;
  customerName: string;
  customerRut?: string;
  customerPhone?: string;
  serviceNames: string[];
  totalPrice: number;
  hasInvoice: boolean;
  paymentMethod: string;
  estimatedMaterialsCost: number;
  netProfit: number;
  status: string;
}

export interface PaymentBreakdownItem {
  methodName: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface CashClosingSummary {
  periodType: CashClosingPeriodType;
  selectedDate: string; // YYYY-MM-DD o YYYY-MM
  dateFormattedLabel: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  grossRevenue: number;
  estimatedSuppliesCost: number;
  netProfit: number;
  grossMarginPercentage: number;
  averageTicket: number;
  invoicesCount: number;
  invoicesTotalAmount: number;
  paymentBreakdown: PaymentBreakdownItem[];
  transactions: CashClosingTransaction[];
}
