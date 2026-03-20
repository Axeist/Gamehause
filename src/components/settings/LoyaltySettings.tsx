import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useLoyaltyConfig } from '@/hooks/useLoyaltyConfig';
import { Loader2 } from 'lucide-react';
import { calculateLoyaltyPointsEarned } from '@/utils/loyaltyPoints';
import type { LoyaltyConfig } from '@/types/loyalty.types';

const PREVIEW_SPEND = 500;

const LoyaltySettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { config, loading, save, refresh } = useLoyaltyConfig();
  const [draft, setDraft] = useState<LoyaltyConfig>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const canEdit = Boolean(user);

  const previewPoints = draft.isEnabled
    ? calculateLoyaltyPointsEarned(PREVIEW_SPEND, draft)
    : 0;

  const handleSave = async () => {
    if (!canEdit) return;
    if (draft.spendThreshold <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Amount required to earn points must be greater than zero.',
        variant: 'destructive',
      });
      return;
    }
    if (draft.pointsPerThreshold === 0) {
      toast({
        title: 'No points will be earned',
        description:
          'Points earned per threshold is zero — customers will not accumulate loyalty points until you set this above zero.',
        duration: 6000,
      });
    }
    setSaving(true);
    try {
      const result = await save(draft);
      if (result.ok) {
        toast({
          title: 'Loyalty settings saved',
          description: 'New rules apply to future checkouts only. Past invoices are unchanged.',
        });
      } else {
        toast({
          title: 'Could not save',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading loyalty settings…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loyalty Points</CardTitle>
        <CardDescription>
          Configure earning rules for completed payments. Updates apply only to future transactions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 max-w-lg">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
          <div className="space-y-0.5">
            <Label htmlFor="loyalty-enabled" className="text-base">
              Enable loyalty system
            </Label>
            <p className="text-xs text-muted-foreground">When off, no points are awarded on new sales.</p>
          </div>
          <Switch
            id="loyalty-enabled"
            checked={draft.isEnabled}
            onCheckedChange={(checked) => setDraft((d) => ({ ...d, isEnabled: checked }))}
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="spend-threshold">Amount Required to Earn Points (₹)</Label>
          <Input
            id="spend-threshold"
            type="number"
            min={1}
            step={1}
            value={draft.spendThreshold}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setDraft((d) => ({ ...d, spendThreshold: Number.isFinite(v) ? v : 0 }));
            }}
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="points-per">Points Earned per Threshold</Label>
          <Input
            id="points-per"
            type="number"
            min={0}
            step={1}
            value={draft.pointsPerThreshold}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setDraft((d) => ({ ...d, pointsPerThreshold: Number.isFinite(v) ? Math.max(0, v) : 0 }));
            }}
            disabled={!canEdit}
          />
          {draft.pointsPerThreshold === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Warning: customers will earn zero points until this is greater than zero.
            </p>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Customers earn{' '}
          <span className="font-medium text-foreground">{draft.pointsPerThreshold}</span> point
          {draft.pointsPerThreshold === 1 ? '' : 's'} for every{' '}
          <span className="font-medium text-foreground">₹{draft.spendThreshold > 0 ? draft.spendThreshold : '—'}</span>{' '}
          spent (after discounts; loyalty redemption reduces the total used for earning).
        </p>

        <div className="rounded-md border border-dashed border-border/80 bg-muted/10 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Example: </span>
          {draft.isEnabled && draft.spendThreshold > 0 ? (
            <>
              If a customer spends ₹{PREVIEW_SPEND.toLocaleString('en-IN')} → earns{' '}
              <span className="font-semibold text-foreground">{previewPoints}</span> points
            </>
          ) : (
            <span className="text-muted-foreground">Enable the system and set a valid spend amount to preview.</span>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="button" onClick={handleSave} disabled={!canEdit || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => void refresh()} disabled={saving}>
            Reload
          </Button>
        </div>

        {!canEdit && (
          <p className="text-xs text-muted-foreground">Sign in with a staff or admin account to edit loyalty rules.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default LoyaltySettings;
