import { supabase } from '@/integrations/supabase/client';
import type { LoyaltyConfig } from '@/types/loyalty.types';
import { DEFAULT_LOYALTY_CONFIG } from '@/types/loyalty.types';

export const LOYALTY_CONFIG_SINGLETON_ID = '00000000-0000-0000-0000-000000000001';

function mapRow(row: {
  is_enabled: boolean;
  spend_threshold: number;
  points_per_threshold: number;
}): LoyaltyConfig {
  return {
    isEnabled: row.is_enabled,
    spendThreshold: Number(row.spend_threshold),
    pointsPerThreshold: row.points_per_threshold,
  };
}

export async function fetchLoyaltyConfig(): Promise<LoyaltyConfig> {
  const { data, error } = await supabase
    .from('loyalty_config')
    .select('is_enabled, spend_threshold, points_per_threshold')
    .eq('id', LOYALTY_CONFIG_SINGLETON_ID)
    .maybeSingle();

  if (error) {
    console.error('fetchLoyaltyConfig', error);
    return DEFAULT_LOYALTY_CONFIG;
  }
  if (!data) return DEFAULT_LOYALTY_CONFIG;
  return mapRow(data);
}

export type SaveLoyaltyResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveLoyaltyConfig(config: LoyaltyConfig): Promise<SaveLoyaltyResult> {
  if (config.spendThreshold <= 0) {
    return { ok: false, error: 'Amount required to earn points must be greater than zero.' };
  }

  const { error } = await supabase.from('loyalty_config').upsert(
    {
      id: LOYALTY_CONFIG_SINGLETON_ID,
      is_enabled: config.isEnabled,
      spend_threshold: config.spendThreshold,
      points_per_threshold: config.pointsPerThreshold,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
