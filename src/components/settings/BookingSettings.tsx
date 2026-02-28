import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Ticket } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STORAGE_KEY = 'gamehaus_booking_coupons';

export type CouponType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: CouponType;
  value: number;
  enabled: boolean;
}

const generateId = () => Math.random().toString(36).slice(2, 11);

const defaultCoupons: Coupon[] = [
  { id: '1', code: 'CUEPHORIA20', description: '20% off on all bookings', type: 'percentage', value: 20, enabled: true },
  { id: '2', code: 'CUEPHORIA35', description: '35% off on all bookings', type: 'percentage', value: 35, enabled: true },
  { id: '3', code: 'HH99', description: 'Happy hours special', type: 'percentage', value: 99, enabled: true },
  { id: '4', code: 'NIT35', description: 'NIT special discount', type: 'percentage', value: 35, enabled: true },
];

function loadCoupons(): Coupon[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : defaultCoupons;
    }
  } catch {
    // ignore
  }
  return defaultCoupons;
}

function saveCoupons(coupons: Coupon[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
}

const BookingSettings = () => {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(() => {
    setCoupons(loadCoupons());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback((next: Coupon[]) => {
    setCoupons(next);
    saveCoupons(next);
  }, []);

  const handleToggle = (id: string, enabled: boolean) => {
    persist(
      coupons.map((c) => (c.id === id ? { ...c, enabled } : c))
    );
    toast({
      title: enabled ? 'Coupon enabled' : 'Coupon disabled',
      description: enabled ? 'This coupon is now available for public bookings.' : 'This coupon is no longer available.',
    });
  };

  const handleUpdate = (id: string, updates: Partial<Coupon>) => {
    persist(
      coupons.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    toast({ title: 'Coupon updated', description: 'Changes have been saved.' });
  };

  const handleDelete = (id: string) => {
    persist(coupons.filter((c) => c.id !== id));
    setDeleteId(null);
    toast({ title: 'Coupon removed', description: 'The coupon has been deleted.', variant: 'destructive' });
  };

  const handleAdd = () => {
    const newCoupon: Coupon = {
      id: generateId(),
      code: '',
      description: '',
      type: 'percentage',
      value: 0,
      enabled: true,
    };
    persist([...coupons, newCoupon]);
    toast({ title: 'Coupon added', description: 'Fill in the code and details below.' });
  };

  const valueLabel = (type: CouponType) => (type === 'percentage' ? 'Value (%)' : 'Value (₹)');

  return (
    <div className="space-y-6">
      <Card className="w-full animate-fade-in">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="h-5 w-5 text-gamehaus-lightpurple" />
            <CardTitle>Coupon Codes</CardTitle>
          </div>
          <CardDescription>
            Manage coupon codes available for public bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Active Coupons</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAdd}
                className="flex items-center gap-2 border-gamehaus-purple/50 text-gamehaus-lightpurple hover:bg-gamehaus-purple/10"
              >
                <Plus className="h-4 w-4" />
                Add Coupon
              </Button>
            </div>

            <div className="space-y-4">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="rounded-lg border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-start gap-4"
                >
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={coupon.code}
                        onChange={(e) => handleUpdate(coupon.id, { code: e.target.value.toUpperCase().trim() })}
                        placeholder="COUPON_CODE"
                        className="max-w-[200px] text-lg font-bold tracking-tight bg-background border-input font-mono uppercase h-9"
                      />
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          coupon.enabled
                            ? 'bg-gamehaus-purple/20 text-gamehaus-lightpurple'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {coupon.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Description</Label>
                      <Input
                        value={coupon.description}
                        onChange={(e) => handleUpdate(coupon.id, { description: e.target.value })}
                        placeholder="e.g. 20% off on all bookings"
                        className="bg-background border-input"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Type</Label>
                        <Select
                          value={coupon.type}
                          onValueChange={(v) => handleUpdate(coupon.id, { type: v as CouponType })}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">{valueLabel(coupon.type)}</Label>
                        <Input
                          type="number"
                          min={0}
                          max={coupon.type === 'percentage' ? 100 : undefined}
                          value={coupon.value}
                          onChange={(e) => handleUpdate(coupon.id, { value: Number(e.target.value) || 0 })}
                          className="bg-background border-input"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Switch
                      checked={coupon.enabled}
                      onCheckedChange={(checked) => handleToggle(coupon.id, checked)}
                      className="data-[state=checked]:bg-gamehaus-purple"
                    />
                    <AlertDialog open={deleteId === coupon.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(coupon.id)}
                        aria-label="Delete coupon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete coupon</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove &quot;{coupon.code}&quot;? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(coupon.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>

            {coupons.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No coupons yet. Click &quot;Add Coupon&quot; to create one.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingSettings;
