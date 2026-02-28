import { supabase } from "@/integrations/supabase/client";
import type { BookingCoupon } from "@/types/coupon.types";
import { BOOKING_COUPONS_CONFIG_KEY, PUBLIC_BOOKING_ENABLED_KEY } from "@/types/coupon.types";

/** Effective discount (type + value) for a coupon, optionally for a station (uses override if present). */
export function getCouponDiscountForStation(
  coupon: BookingCoupon,
  stationId?: string
): { discount_type: "percentage" | "fixed"; discount_value: number } {
  const override = stationId && coupon.station_overrides?.[stationId];
  if (override) return { discount_type: override.discount_type, discount_value: override.discount_value };
  return { discount_type: coupon.discount_type, discount_value: coupon.discount_value };
}

/** Compute discount amount for a given price using type and value. */
export function computeDiscountAmount(
  price: number,
  discount_type: "percentage" | "fixed",
  discount_value: number
): number {
  if (discount_type === "percentage") return price * (discount_value / 100);
  return Math.min(discount_value, price);
}

export async function getBookingCouponsConfig(): Promise<BookingCoupon[]> {
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", BOOKING_COUPONS_CONFIG_KEY)
    .single();

  if (error) {
    if (error.code === "PGRST116") return [];
    throw error;
  }

  const value = data?.value;
  if (!value || !Array.isArray(value)) return [];
  return value as BookingCoupon[];
}

export async function setBookingCouponsConfig(coupons: BookingCoupon[]): Promise<void> {
  const { error } = await supabase
    .from("app_config")
    .upsert({ key: BOOKING_COUPONS_CONFIG_KEY, value: coupons }, { onConflict: "key" });

  if (error) throw error;
}

/** Enabled coupons only, for use at checkout. */
export async function getEnabledBookingCoupons(): Promise<BookingCoupon[]> {
  const all = await getBookingCouponsConfig();
  return all.filter((c) => c.enabled);
}

/** Whether the public booking page is enabled (when false, show unavailable). */
export async function getPublicBookingEnabled(): Promise<boolean> {
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", PUBLIC_BOOKING_ENABLED_KEY)
    .single();

  if (error || data?.value == null) return true;
  return data.value === true;
}

export async function setPublicBookingEnabled(enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from("app_config")
    .upsert({ key: PUBLIC_BOOKING_ENABLED_KEY, value: enabled }, { onConflict: "key" });

  if (error) throw error;
}

/** Enabled coupons that should appear in the "available coupons" list on the booking page (show_on_booking_page !== false). */
export function getCouponsShownOnBookingPage(coupons: BookingCoupon[]): BookingCoupon[] {
  return coupons.filter((c) => c.enabled && c.show_on_booking_page !== false);
}
