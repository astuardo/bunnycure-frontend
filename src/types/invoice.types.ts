export interface InvoiceSummary {
  generatedThisMonth: number;
  pendingInvoicesCount: number;
  failedInvoicesCount: number;
  totalAmountMonth: number;
  apiGatewayConfigured: boolean;
  emisorRut?: string;
  sendEmailEnabled?: boolean;
}

export interface InvoicePendingAppointment {
  appointmentId: number;
  appointmentDate: string;
  appointmentTime: string;
  customerId?: number;
  customerName: string;
  customerRut?: string;
  customerEmail?: string;
  customerPhone?: string;
  servicesSummary: string;
  specialistName: string;
  totalAmount: number;
  invoiceLogId?: number;
  invoiceStatus: 'FAILED' | 'PENDING' | 'NOT_ATTEMPTED' | string;
  errorMessage?: string;
  lastAttemptAt?: string;
  rutStatus: 'VALID' | 'INVALID' | 'MISSING';
  canEmit: boolean;
}

export interface InvoiceIssuedItem {
  id: number;
  appointmentId?: number;
  appointmentDate?: string;
  customerId?: number;
  customerName: string;
  customerRut?: string;
  customerEmail?: string;
  invoiceNumber: string;
  siiCode?: string;
  siiBarcode?: string;
  amountInClp: number;
  status: string;
  emailSent?: boolean;
  emailRecipient?: string;
  emailSentAt?: string;
  createdAt: string;
  description?: string;
}

export interface InvoiceContrastResult {
  periodo: string;
  queriedAt: string;
  fromCache: boolean;
  siiTotalCount: number;
  siiTotalAmount: number;
  localTotalCount: number;
  localTotalAmount: number;
  matchedCount: number;
  pendingEmitCount: number;
  siiOnlyCount: number;
  rawSiiResponse?: any;
  localInvoices: InvoiceIssuedItem[];
  pendingAppointments: InvoicePendingAppointment[];
}

export interface EmitInvoiceRequest {
  customerRut?: string;
  customerEmail?: string;
}

export interface MarkManualRequest {
  invoiceNumber?: string;
  notes?: string;
}

export interface BatchMarkManualRequest {
  appointmentIds: number[];
  initialFolio?: string;
  notes?: string;
}

export interface BatchEmitResponse {
  total: number;
  successCount: number;
  failedCount: number;
  results: InvoiceIssuedItem[];
  errors: Array<{ appointmentId: number; error: string }>;
}

export const SII_CANCEL_CAUSES = [
  { value: '3', label: '3 - Error de digitación (Recomendada)' },
  { value: '2', label: '2 - No prestación del servicio' },
  { value: '1', label: '1 - No pago de honorarios' },
];

