/**
 * Ordering for booking times on a single calendar date: 11:00 … 23:30, then 00:00 … 01:30 (same “night”).
 * Used for sorts, contiguous selection, and “elapsed” when the selected date is today.
 */
export const BOOKING_DAY_OPENING_HOUR = 11;

export function bookingSlotSortMinutes(timeStr: string): number {
  const clean = (timeStr || "").trim().replace(/\.\d+/, "");
  const [h = 0, m = 0] = clean.split(":").map((x) => parseInt(x, 10) || 0);
  let mins = h * 60 + m;
  if (h < BOOKING_DAY_OPENING_HOUR) mins += 24 * 60;
  return mins;
}

export function compareBookingSlotStart(a: string, b: string): number {
  return bookingSlotSortMinutes(a) - bookingSlotSortMinutes(b);
}

export function compareBookingSlotIntervals<T extends { start_time: string }>(a: T, b: T): number {
  return compareBookingSlotStart(a.start_time, b.start_time);
}

/** Minutes from 11:00 on the booking date through 02:00 next morning (15h → 0..900). */
export function minutesFromBookingDayOpen(timeStr: string): number {
  const clean = (timeStr || "").trim().replace(/\.\d+/, "");
  const [h = 0, m = 0] = clean.split(":").map((x) => parseInt(x, 10) || 0);
  const slotMins = h * 60 + m;
  const openMins = BOOKING_DAY_OPENING_HOUR * 60;
  if (h < BOOKING_DAY_OPENING_HOUR) return slotMins + 24 * 60 - openMins;
  return slotMins - openMins;
}

export function isBookingSlotElapsed(
  bookingDateStr: string,
  slotStartTime: string,
  now: Date = new Date()
): boolean {
  const clean = (slotStartTime || "").trim().replace(/\.\d+/, "");
  const [h = 0, m = 0] = clean.split(":").map((x) => parseInt(x, 10) || 0);
  const overnight = h < BOOKING_DAY_OPENING_HOUR;
  const [y, mo, d] = bookingDateStr.split("-").map((x) => parseInt(x, 10));
  const slotDate = new Date(y, mo - 1, d, h, m, 0, 0);
  if (overnight) slotDate.setDate(slotDate.getDate() + 1);
  return slotDate.getTime() <= now.getTime();
}
