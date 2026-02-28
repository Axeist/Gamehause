export type BookingCouponDiscountType = "percentage" | "fixed";

/** Station types that can have per-station discount overrides. */
export type BookingCouponStationType = "8ball" | "ps5" | "foosball";

export interface StationDiscountOverride {
  discount_type: BookingCouponDiscountType;
  discount_value: number;
}

export interface BookingCoupon {
  code: string;
  description: string;
  discount_type: BookingCouponDiscountType;
  discount_value: number;
  enabled: boolean;
  /** When true (default), this coupon appears in the "available coupons" list on the public booking page. */
  show_on_booking_page?: boolean;
  /** Optional per-station-type overrides. If set for a type, that type uses this instead of global discount. */
  station_overrides?: Partial<Record<BookingCouponStationType, StationDiscountOverride>>;
}

export const BOOKING_COUPONS_CONFIG_KEY = "booking_coupons";
/** When true, the public booking page is available; when false, show unavailable message. */
export const PUBLIC_BOOKING_ENABLED_KEY = "public_booking_enabled";
