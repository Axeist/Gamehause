import type { SupabaseClient } from "@supabase/supabase-js";
import { format, parseISO } from "date-fns";
import { bookingSlotSortMinutes, minutesFromBookingDayOpen } from "@/utils/bookingSlotOrder";

/** Normalize DB/RPC time to HH:MM:SS */
export function normalizeSlotTime(t: string): string {
  const base = (t || "").trim().replace(/\.\d+/, "");
  const parts = base.split(":");
  const h = String(Number(parts[0] ?? 0)).padStart(2, "0");
  const m = String(Number(parts[1] ?? 0)).padStart(2, "0");
  const s = String(Number(parts[2] ?? 0)).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const LATE_NIGHT_30_MIN: [string, string][] = [
  ["00:00:00", "00:30:00"],
  ["00:30:00", "01:00:00"],
  ["01:00:00", "01:30:00"],
  ["01:30:00", "02:00:00"],
];

const MIDNIGHT_START_MIN = minutesFromBookingDayOpen("00:00:00");

/**
 * True when RPC still stops at the last pre-midnight half-hour (legacy get_available_slots).
 * When the DB already returns 00:00–02:00 slots, returns false.
 */
export function shouldAppendLateNight30MinSlots(slots: { start_time: string; end_time: string }[]): boolean {
  if (!slots.length) return false;
  if (
    slots.some((s) => bookingSlotSortMinutes(s.start_time) >= MIDNIGHT_START_MIN)
  ) {
    return false;
  }
  const last = slots[slots.length - 1];
  const ns = normalizeSlotTime(last.start_time);
  const ne = normalizeSlotTime(last.end_time);
  if (ns === "23:30:00" && ne === "00:00:00") return true;
  if (ns.startsWith("23:") && (ne === "23:59:59" || ne.startsWith("23:59"))) return true;
  return false;
}

function bookingEndSessionMin(endTime: string): number {
  const n = normalizeSlotTime(endTime);
  if (n === "23:59:59" || n.startsWith("23:59:5")) {
    return minutesFromBookingDayOpen("00:00:00");
  }
  return minutesFromBookingDayOpen(endTime);
}

function bookingWallInterval(b: { start_time: string; end_time: string }): [number, number] {
  const a = minutesFromBookingDayOpen(b.start_time);
  const z = bookingEndSessionMin(b.end_time);
  return [a, z];
}

function overlapsHalfOpen(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}

function slotWallInterval(start: string, end: string): [number, number] {
  return [minutesFromBookingDayOpen(start), minutesFromBookingDayOpen(end)];
}

async function hasActiveOpenSessionOnDate(
  supabase: SupabaseClient,
  stationId: string,
  dateStr: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("sessions")
    .select("start_time")
    .eq("station_id", stationId)
    .is("end_time", null);
  if (error || !data?.length) return false;
  return data.some((row) => {
    try {
      return format(parseISO(row.start_time as string), "yyyy-MM-dd") === dateStr;
    } catch {
      return false;
    }
  });
}

function currentBookingDayMinutes(now: Date): number {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return minutesFromBookingDayOpen(`${hh}:${mm}:${ss}`);
}

/**
 * If the server only returns slots through 11:30 PM–12:00 AM, append 12:00 AM–2:00 AM
 * and set availability from bookings + open session (matches get_available_slots rules).
 */
export async function appendLateNight30MinSlotsIfNeeded<
  T extends { start_time: string; end_time: string; is_available: boolean; status?: string },
>(
  slots: T[],
  opts: {
    supabase: SupabaseClient;
    dateStr: string;
    stationId: string;
    isToday: boolean;
  }
): Promise<T[]> {
  if (!shouldAppendLateNight30MinSlots(slots)) return slots;

  const { supabase, dateStr, stationId, isToday } = opts;

  const { data: bookings, error: be } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .eq("station_id", stationId)
    .eq("booking_date", dateStr)
    .in("status", ["confirmed", "in-progress"]);

  if (be) {
    console.warn("appendLateNight30MinSlotsIfNeeded: could not load bookings", be);
    return slots;
  }

  const bIntervals = (bookings || []).map((b) => bookingWallInterval(b as { start_time: string; end_time: string }));

  const sessionBlocks = isToday ? await hasActiveOpenSessionOnDate(supabase, stationId, dateStr) : false;
  const nowMins = isToday ? currentBookingDayMinutes(new Date()) : -1;

  const extra: T[] = LATE_NIGHT_30_MIN.map(([start, end]) => {
    const [s0, s1] = slotWallInterval(start, end);
    let is_available = true;
    const sessionBlocksThisSlot = sessionBlocks && nowMins >= s0 && nowMins < s1;
    if (sessionBlocksThisSlot) {
      is_available = false;
    } else {
      for (const [b0, b1] of bIntervals) {
        if (overlapsHalfOpen(s0, s1, b0, b1)) {
          is_available = false;
          break;
        }
      }
    }
    return {
      start_time: start,
      end_time: end,
      is_available,
      status: is_available ? "available" : "booked",
    } as T;
  });

  return [...slots, ...extra];
}
