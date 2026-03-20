import type { LoyaltyConfig } from '@/types/loyalty.types';

export function calculateLoyaltyPointsEarned(
  totalAmount: number,
  config: LoyaltyConfig,
  options?: { isComplimentary?: boolean }
): number {
  if (options?.isComplimentary) return 0;
  if (!config.isEnabled) return 0;
  const threshold = config.spendThreshold;
  if (threshold <= 0) return 0;
  return Math.floor(totalAmount / threshold) * config.pointsPerThreshold;
}
