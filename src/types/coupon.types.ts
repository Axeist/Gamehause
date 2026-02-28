export type BookingCouponDiscountType = "percentage" | "fixed";

export interface BookingCoupon {
  code: string;
  description: string;
  discount_type: BookingCouponDiscountType;
  discount_value: number;
  enabled: boolean;
}

export const BOOKING_COUPONS_CONFIG_KEY = "booking_coupons";
