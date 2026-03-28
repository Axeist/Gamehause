/**
 * Keep in sync with src/utils/bookingSlotMerge.ts (serverless cannot import from src reliably).
 */
export function areSlotTimesContiguous(endTime: string, startTime: string): boolean {
  const toSecs = (t: string) => {
    const clean = (t || "").trim().replace(/\.\d+/, "").replace(/Z$/i, "");
    const p = clean.split(":").map((x) => parseInt(x, 10) || 0);
    const [h = 0, m = 0, s = 0] = p;
    return h * 3600 + m * 60 + s;
  };
  return toSecs(endTime) === toSecs(startTime);
}

export type SlotInterval = { start_time: string; end_time: string };

export type MergedSlot = SlotInterval & { slotCount: number };

function sortByStart(a: SlotInterval, b: SlotInterval): number {
  return a.start_time.localeCompare(b.start_time);
}

export function mergeContiguousSlots(slots: SlotInterval[]): MergedSlot[] {
  if (!slots.length) return [];
  const seen = new Set<string>();
  const unique: SlotInterval[] = [];
  for (const s of slots) {
    const key = `${s.start_time}\0${s.end_time}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(s);
  }
  unique.sort(sortByStart);
  const runs: MergedSlot[] = [];
  let cur: MergedSlot = {
    start_time: unique[0].start_time,
    end_time: unique[0].end_time,
    slotCount: 1,
  };
  for (let i = 1; i < unique.length; i++) {
    const s = unique[i];
    if (cur.end_time === s.start_time) {
      cur.end_time = s.end_time;
      cur.slotCount += 1;
    } else {
      runs.push(cur);
      cur = { start_time: s.start_time, end_time: s.end_time, slotCount: 1 };
    }
  }
  runs.push(cur);
  return runs;
}

type BookingDataLike = {
  selectedStations?: string[];
  slotsByStation?: Record<string, SlotInterval[]>;
  slots?: SlotInterval[];
};

export function getSlotsPerStation(bookingData: BookingDataLike): Record<string, SlotInterval[]> {
  const stationIds = bookingData.selectedStations || [];
  if (bookingData.slotsByStation && typeof bookingData.slotsByStation === "object") {
    const out: Record<string, SlotInterval[]> = {};
    for (const id of stationIds) {
      const arr = bookingData.slotsByStation[id];
      out[id] = Array.isArray(arr) ? arr : [];
    }
    return out;
  }
  const slots = bookingData.slots || [];
  const out: Record<string, SlotInterval[]> = {};
  for (const id of stationIds) {
    out[id] = slots.map((s) => ({ ...s }));
  }
  return out;
}

export function totalRawSlotCount(slotsByStation: Record<string, SlotInterval[]>): number {
  return Object.values(slotsByStation).reduce((sum, arr) => sum + arr.length, 0);
}

export type RazorpayBookingRowExtras = {
  payment_mode: string;
  payment_txn_id: string;
  notes: string;
};

export function buildBookingRowsFromRazorpayPayload(
  bookingData: {
    selectedStations?: string[];
    selectedDateISO?: string;
    slotsByStation?: Record<string, SlotInterval[]>;
    slots?: SlotInterval[];
    playerCounts?: Record<string, number>;
    pricing?: { original?: number; discount?: number; final?: number; coupons?: string | null };
  },
  customerId: string,
  extras: RazorpayBookingRowExtras
): Record<string, unknown>[] {
  const stations = bookingData.selectedStations || [];
  const slotsByStation = getSlotsPerStation(bookingData);
  const totalSlots = totalRawSlotCount(slotsByStation);
  if (totalSlots === 0) return [];

  const orig = bookingData.pricing?.original ?? 0;
  const disc = bookingData.pricing?.discount ?? 0;
  const fin = bookingData.pricing?.final ?? 0;
  const coupons = bookingData.pricing?.coupons ?? null;

  const rows: Record<string, unknown>[] = [];
  for (const station_id of stations) {
    const raw = slotsByStation[station_id] || [];
    const merged = mergeContiguousSlots(raw);
    const playerCount = bookingData.playerCounts?.[station_id] ?? 1;
    for (const block of merged) {
      rows.push({
        station_id,
        customer_id: customerId,
        booking_date: bookingData.selectedDateISO,
        start_time: block.start_time,
        end_time: block.end_time,
        duration: 30 * block.slotCount,
        status: "confirmed",
        player_count: playerCount,
        original_price: totalSlots > 0 ? (orig / totalSlots) * block.slotCount : 0,
        discount_percentage: disc > 0 && orig > 0 ? (disc / orig) * 100 : null,
        final_price: totalSlots > 0 ? (fin / totalSlots) * block.slotCount : 0,
        coupon_code: coupons || null,
        payment_mode: extras.payment_mode,
        payment_txn_id: extras.payment_txn_id,
        notes: extras.notes,
      });
    }
  }
  return rows;
}
