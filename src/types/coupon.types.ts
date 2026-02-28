export type BookingCouponDiscountType = "percentage" | "fixed";

export interface BookingCoupon {
  code: string;
  description: string;
  discount_type: BookingCouponDiscountType;
  discount_value: number;
  enabled: boolean;
}

export const BOOKING_COUPONS_CONFIG_KEY = "booking_coupons";
/** When true, the public booking page shows a list of available coupons with Apply buttons. */
export const BOOKING_COUPONS_SHOW_LIST_KEY = "booking_coupons_show_list";
