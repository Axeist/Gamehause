import { supabase } from "@/integrations/supabase/client";
import type { BookingCoupon } from "@/types/coupon.types";
import { BOOKING_COUPONS_CONFIG_KEY, BOOKING_COUPONS_SHOW_LIST_KEY } from "@/types/coupon.types";

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

/** Whether to show the list of available coupons on the public booking page. */
export async function getBookingCouponsShowList(): Promise<boolean> {
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", BOOKING_COUPONS_SHOW_LIST_KEY)
    .single();

  if (error || data?.value == null) return false;
  return data.value === true;
}

export async function setBookingCouponsShowList(show: boolean): Promise<void> {
  const { error } = await supabase
    .from("app_config")
    .upsert({ key: BOOKING_COUPONS_SHOW_LIST_KEY, value: show }, { onConflict: "key" });

  if (error) throw error;
}
