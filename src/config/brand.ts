export const BRAND_NAME = "Gamehaus" as const;
export const BRAND_NAME_UPPER = "GAMEHAUS" as const;

// Single canonical domain (no subdomains)
export const BASE_URL = "https://gamehaus.co.in" as const;

export const SUPPORT_EMAIL = "contact@gamehaus.co.in" as const;
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

