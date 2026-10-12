export interface LoyaltyCardPublicDto {
  publicId: string;
  customerName: string;
  firstName: string;
  phone: string;
  loyaltyStamps: number;
  totalCompletedVisits: number;
  maxStamps: number;
  stampsRemaining: number;
  progressPercent: number;
  currentRewardName: string;
  rewardAvailable: boolean;
  rewardStatusMessage: string;
  qrValue: string;
  googleWalletUrl?: string | null;
  salonName?: string;
  salonInstagram?: string;
  salonWhatsapp?: string;
}
