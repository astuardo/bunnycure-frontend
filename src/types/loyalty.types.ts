export interface LoyaltyReward {
  id: number;
  name: string;
  description?: string;
  orderIndex: number;
}

export interface LoyaltyRewardHistory {
  id: number;
  rewardName: string;
  earnedAt: string;
  appointmentId?: number;
}
