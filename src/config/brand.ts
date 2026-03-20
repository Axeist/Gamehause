export const BRAND_NAME = "Gamehaus" as const;
export const BRAND_NAME_UPPER = "GAMEHAUS" as const;

// Single canonical domain (no subdomains)
export const BASE_URL = "https://gamehaus.co.in" as const;

export const SUPPORT_EMAIL = "contact@gamehaus.co.in" as const;
export const SUPPORT_PHONE_PRIMARY = "9994166622" as const;
export const SUPPORT_PHONE_SECONDARY = "9345187098" as const;
/** Printed on invoices (both numbers, exact formatting). */
export const INVOICE_PHONES_DISPLAY =
  "+91 99941 66622/+91 93451 87098" as const;
export const ADDRESS =
  "4th Floor, Silingi Building, 142, Greams Rd, Thousand Lights West, Thousand Lights, Chennai, Tamil Nadu 600006" as const;
/** Display string for business hours (e.g. for footer and location section). */
export const BUSINESS_HOURS = "1 PM – 2 AM" as const;
/** Google Maps share link for the venue (open in Maps / get directions). */
export const GOOGLE_MAPS_LINK = "https://share.google/5RwCdRAnT1Qdr4oq1" as const;
export const LOGO_PATH = "/brand/gamehaus-logo.png" as const;

/**
 * Safely join BASE_URL + path.
 * - Ensures exactly one `/` between base and path
 * - Accepts paths with or without leading slash
 */
export function url(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, BASE_URL).toString();
}

// Route constants (match existing routes)
export const PUBLIC_BOOKING_URL = url("/public/booking");
export const PUBLIC_STATIONS_URL = url("/public/stations");
export const PUBLIC_TOURNAMENTS_URL = url("/public/tournaments");
export const PAYMENT_SUCCESS_URL = url("/public/payment/success");
export const PAYMENT_FAILED_URL = url("/public/payment/failed");

