import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Ticket, Loader2 } from 'lucide-react';
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
import type { BookingCoupon, BookingCouponDiscountType } from '@/types/coupon.types';
import { getBookingCouponsConfig, setBookingCouponsConfig } from '@/services/bookingCouponConfig';

const valueLabel = (type: BookingCouponDiscountType) =>
  type === 'percentage' ? 'Value (%)' : 'Value (₹)';

const BookingSettings = () => {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<BookingCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBookingCouponsConfig();
      setCoupons(data);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error loading coupons',
        description: 'Could not load coupon config. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (next: BookingCoupon[], successMessage?: string) => {
      setSaving(true);
      try {
        await setBookingCouponsConfig(next);
        setCoupons(next);
        if (successMessage !== undefined) {
          toast({ title: successMessage, description: 'Changes have been saved to the server.' });
        }
      } catch (e) {
        console.error(e);
        toast({
          title: 'Error saving coupons',
          description: 'Could not save. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
    },
    [toast]
  );

  const handleToggle = (index: number, enabled: boolean) => {
    const next = coupons.map((c, i) => (i === index ? { ...c, enabled } : c));
    save(next, enabled ? 'Coupon enabled' : 'Coupon disabled');
  };

  const handleUpdate = (index: number, updates: Partial<BookingCoupon>) => {
    const next = coupons.map((c, i) => (i === index ? { ...c, ...updates } : c));
    save(next, 'Coupon updated');
  };

  const handleDelete = (index: number) => {
    const next = coupons.filter((_, i) => i !== index);
    save(next);
    setDeleteIndex(null);
    toast({ title: 'Coupon removed', description: 'The coupon has been deleted.', variant: 'destructive' });
  };

  const handleAdd = () => {
    const newCoupon: BookingCoupon = {
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      enabled: true,
    };
    save([...coupons, newCoupon], 'Coupon added');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gamehaus-lightpurple" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full animate-fade-in">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="h-5 w-5 text-gamehaus-lightpurple" />
            <CardTitle>Coupon Codes</CardTitle>
          </div>
          <CardDescription>
            Manage coupon codes available for public bookings. Only enabled coupons can be applied at checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Coupons</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAdd}
                disabled={saving}
                className="flex items-center gap-2 border-gamehaus-purple/50 text-gamehaus-lightpurple hover:bg-gamehaus-purple/10"
              >
                <Plus className="h-4 w-4" />
                Add Coupon
              </Button>
            </div>

            <div className="space-y-4">
              {coupons.map((coupon, index) => (
                <div
                  key={`${coupon.code}-${index}`}
                  className="rounded-lg border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-start gap-4"
                >
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={coupon.code}
                        onChange={(e) =>
                          handleUpdate(index, { code: e.target.value.toUpperCase().trim() })
                        }
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
                        onChange={(e) => handleUpdate(index, { description: e.target.value })}
                        placeholder="e.g. 20% off on all bookings"
                        className="bg-background border-input"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Discount type</Label>
                        <Select
                          value={coupon.discount_type}
                          onValueChange={(v) =>
                            handleUpdate(index, { discount_type: v as BookingCouponDiscountType })
                          }
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed amount (₹)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">
                          {valueLabel(coupon.discount_type)}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={coupon.discount_type === 'percentage' ? 100 : undefined}
                          value={coupon.discount_value}
                          onChange={(e) =>
                            handleUpdate(index, {
                              discount_value: Number(e.target.value) || 0,
                            })
                          }
                          className="bg-background border-input"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Switch
                      checked={coupon.enabled}
                      onCheckedChange={(checked) => handleToggle(index, checked)}
                      className="data-[state=checked]:bg-gamehaus-purple"
                    />
                    <AlertDialog
                      open={deleteIndex === index}
                      onOpenChange={(open) => !open && setDeleteIndex(null)}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteIndex(index)}
                        aria-label="Delete coupon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete coupon</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove &quot;{coupon.code || 'this coupon'}&quot;?
                            This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(index)}
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
