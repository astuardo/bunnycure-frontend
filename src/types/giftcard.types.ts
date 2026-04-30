export type GiftCardStatus = 'ACTIVE' | 'PARTIAL' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';
export type GiftCardPaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA';
export type GiftCardAuditActor = 'ADMIN' | 'PUBLIC';
export type GiftCardEventType = 'CREATED' | 'REDEEMED' | 'REVERTED' | 'OVERRIDE_EXPIRED' | 'CANCELLED';

export interface GiftCardItem {
  id: number;
  serviceId: number | null;
  serviceName: string;
  unitPrice: number;
  quantity: number;
  redeemedQuantity: number;
  remainingQuantity: number;
}

export interface GiftCardEvent {
  id: number;
  eventType: GiftCardEventType;
  giftCardItemId: number | null;
  quantity: number | null;
  note: string | null;
  actor: GiftCardAuditActor;
  actorUserId: number | null;
  actorUsername: string | null;
  requestIp: string | null;
  userAgent: string | null;
  relatedEventId: number | null;
  createdAt: string;
}

export interface GiftCard {
  id: number;
  code: string;
  status: GiftCardStatus;
  beneficiaryName: string;
  beneficiaryPhone: string;
  beneficiaryEmail: string | null;
  beneficiaryCustomerId: number | null;
  buyerName: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  expiresOn: string;
  issuedAt: string;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: GiftCardPaymentMethod;
  publicUrl: string;
  items: GiftCardItem[];
  events: GiftCardEvent[] | null;
  plainPin: string | null;
}

export interface GiftCardItemRequest {
  serviceId: number;
  quantity: number;
}

export interface GiftCardCreateRequest {
  beneficiaryFullName: string;
  beneficiaryPhone: string;
  beneficiaryEmail?: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  expiresOn: string;
  paidAmount: number;
  paymentMethod: GiftCardPaymentMethod;
  items: GiftCardItemRequest[];
}

export interface GiftCardRedeemItemRequest {
  giftCardItemId: number;
  quantity: number;
}

export interface GiftCardRedeemRequest {
  pin?: string;
  note: string;
  allowExpiredOverride?: boolean;
  overrideReason?: string;
  items: GiftCardRedeemItemRequest[];
}

export interface GiftCardRevertRequest {
  note: string;
  items: GiftCardRedeemItemRequest[];
}
