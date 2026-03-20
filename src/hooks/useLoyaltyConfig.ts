import { useState, useEffect, useCallback } from 'react';
import { fetchLoyaltyConfig, saveLoyaltyConfig } from '@/services/loyaltyConfig';
import type { LoyaltyConfig } from '@/types/loyalty.types';
import { DEFAULT_LOYALTY_CONFIG } from '@/types/loyalty.types';

export function useLoyaltyConfig() {
  const [config, setConfig] = useState<LoyaltyConfig>(DEFAULT_LOYALTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchLoyaltyConfig();
      setConfig(next);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to load loyalty settings');
      setConfig(DEFAULT_LOYALTY_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (next: LoyaltyConfig) => {
      const result = await saveLoyaltyConfig(next);
      if (result.ok) {
        setConfig(next);
      }
      return result;
    },
    []
  );

  return { config, loading, error, refresh, save };
}
