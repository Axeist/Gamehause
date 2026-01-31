import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export type StationType = "ps5" | "8ball" | "foosball";

export type StationLite = {
  id: string;
  name: string;
  type: StationType;
  hourly_rate: number;
};

export type TimeSlot = {
  start_time: string; // e.g. "11:00:00"
  end_time: string; // e.g. "11:30:00"
  is_available: boolean;
  status?: "available" | "booked" | "elapsed";
};

export type CustomerLite = {
  id: string;
  name: string;
  phone: string;
};

export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function validateIndianPhoneNumber(phone: string): { valid: boolean; error?: string } {
  const normalized = normalizePhoneNumber(phone);
  if (normalized.length !== 10) return { valid: false, error: "Phone number must be exactly 10 digits." };
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(normalized)) {
    return { valid: false, error: "Please enter a valid Indian mobile number (starting with 6–9)." };
  }
  return { valid: true };
}

export async function lookupCustomerByPhone(phone: string): Promise<CustomerLite | null> {
  const normalized = normalizePhoneNumber(phone);
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("phone", normalized)
    .maybeSingle();
  if (error && (error as any).code !== "PGRST116") throw error;
  if (!data) return null;
  return { id: data.id, name: data.name, phone: data.phone };
}

export async function fetchStations(): Promise<StationLite[]> {
  const { data, error } = await supabase
    .from("stations")
    .select("id, name, type, hourly_rate")
    .order("name");
  if (error) throw error;

  const normalized: StationLite[] = (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    type: s.type === "ps5" || s.type === "8ball" || s.type === "foosball" ? s.type : "ps5",
    hourly_rate: Number(s.hourly_rate ?? 0),
  }));

  return normalized;
}

export function toSlotTimeString(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // Accept "18:00" or "18:00:00"
  const m24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m24) {
    const hh = Number(m24[1]);
    const mm = Number(m24[2]);
    if (Number.isNaN(hh) || Number.isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
  }

  // Accept "6pm", "6 pm", "6:30pm"
  const m12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (m12) {
    let hh = Number(m12[1]);
    const mm = Number(m12[2] ?? "00");
    const ap = m12[3];
    if (hh < 1 || hh > 12 || mm < 0 || mm > 59) return null;
    if (ap === "pm" && hh !== 12) hh += 12;
    if (ap === "am" && hh === 12) hh = 0;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
  }

  return null;
}

export function toDateString(input: string): string | null {
  const t = input.trim().toLowerCase();
  if (!t) return null;
  const now = new Date();
  if (t === "today") return format(now, "yyyy-MM-dd");
  if (t === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return format(d, "yyyy-MM-dd");
  }

  // yyyy-mm-dd
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return t;

  // dd/mm/yyyy
  const dmy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const dd = Number(dmy[1]);
    const mm = Number(dmy[2]);
    const yyyy = Number(dmy[3]);
    if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;
    return `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  return null;
}

export async function getAvailableSlotsForStation(dateStr: string, stationId: string): Promise<TimeSlot[]> {
  const slotDuration = 30;
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_date: dateStr,
    p_station_id: stationId,
    p_slot_duration: slotDuration,
  });
  if (error) throw error;
  return (data || []) as TimeSlot[];
}

export function markElapsedIfToday(dateStr: string, slots: TimeSlot[]): TimeSlot[] {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  if (dateStr !== todayStr) return slots;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return slots.map((slot) => {
    const [hhS, mmS] = slot.start_time.split(":");
    const hh = Number(hhS);
    const mm = Number(mmS);
    const isPast = hh < currentHour || (hh === currentHour && mm <= currentMinute);
    if (!isPast) return slot;
    return { ...slot, is_available: false, status: "elapsed" };
  });
}

export async function getAvailableSlotsUnion(dateStr: string, stationIds: string[]): Promise<TimeSlot[]> {
  if (stationIds.length === 0) return [];

  const results = await Promise.all(
    stationIds.map((id) =>
      supabase.rpc("get_available_slots", {
        p_date: dateStr,
        p_station_id: id,
        p_slot_duration: 30,
      })
    )
  );

  const base = results.find((r) => !r.error && Array.isArray(r.data))?.data as TimeSlot[] | undefined;
  if (!base) {
    const firstErr = results.find((r) => r.error)?.error;
    if (firstErr) throw firstErr;
    return [];
  }

  const key = (s: TimeSlot) => `${s.start_time}-${s.end_time}`;
  const union = new Map<string, boolean>();
  base.forEach((s) => union.set(key(s), Boolean(s.is_available)));

  for (const r of results) {
    for (const s of (r.data || []) as TimeSlot[]) {
      const k = key(s);
      union.set(k, Boolean(union.get(k)) || Boolean(s.is_available));
    }
  }

  const merged = base.map((s) => ({
    ...s,
    is_available: union.get(key(s)) ?? false,
    status: union.get(key(s)) ? "available" : "booked",
  }));

  return markElapsedIfToday(dateStr, merged);
}

export function formatSlotLabel(slotStart: string): string {
  // input like "18:00:00"
  const [hh, mm] = slotStart.split(":");
  const h = Number(hh);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${mm} ${suffix}`;
}

export function buildPublicBookingUrl(params: {
  phone: string;
  stationType: StationType | "all";
  dateStr: string;
  startTime?: string; // "HH:mm:ss"
}): string {
  const qp = new URLSearchParams();
  qp.set("phone", normalizePhoneNumber(params.phone));
  if (params.stationType !== "all") qp.set("type", params.stationType);
  qp.set("date", params.dateStr);
  if (params.startTime) qp.set("time", params.startTime);
  return `/public/booking?${qp.toString()}`;
}

