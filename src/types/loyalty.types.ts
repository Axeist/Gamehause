export type LoyaltyConfig = {
  isEnabled: boolean;
  spendThreshold: number;
  pointsPerThreshold: number;
};

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  isEnabled: true,
  spendThreshold: 100,
  pointsPerThreshold: 10,
};
