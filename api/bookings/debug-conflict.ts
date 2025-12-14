// Debug script to find what's blocking the 23:30-00:00 slot
// This will query the database directly to see what bookings exist

import { supabase } from "@/integrations/supabase/client";

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json();
    const { station_id, booking_date } = payload;

    if (!station_id || !booking_date) {
      return j({ 
        ok: false, 
        error: "Missing required fields: station_id, booking_date" 
      }, 400);
    }

    console.log("🔍 Debugging conflicts for:", { station_id, booking_date });

    // Get ALL bookings for this station on this date (any status)
    const { data: allBookings, error: allError } = await supabase
      .from('bookings')
      .select(`
        id,
        station_id,
        booking_date,
        start_time,
        end_time,
        status,
        customer_id,
        payment_txn_id,
        created_at,
        stations!inner(name)
      `)
      .eq('station_id', station_id)
      .eq('booking_date', booking_date)
      .order('start_time', { ascending: true });

    // Get confirmed/in-progress bookings specifically
    const { data: activeBookings, error: activeError } = await supabase
      .from('bookings')
      .select(`
        id,
        station_id,
        booking_date,
        start_time,
        end_time,
        status,
        customer_id,
        payment_txn_id,
        created_at,
        stations!inner(name)
      `)
      .eq('station_id', station_id)
      .eq('booking_date', booking_date)
      .in('status', ['confirmed', 'in-progress'])
      .order('start_time', { ascending: true });

    // Test the overlap function directly
    const { data: overlapResult, error: overlapError } = await (supabase as any).rpc('check_booking_overlap', {
      p_station_id: station_id,
      p_booking_date: booking_date,
      p_start_time: '23:30:00',
      p_end_time: '00:00:00',
      p_exclude_booking_id: null,
    });

    // Also check for bookings ending at midnight
    const { data: midnightBookings, error: midnightError } = await supabase
      .from('bookings')
      .select(`
        id,
        station_id,
        booking_date,
        start_time,
        end_time,
        status,
        customer_id,
        payment_txn_id,
        created_at,
        stations!inner(name)
      `)
      .eq('station_id', station_id)
      .eq('booking_date', booking_date)
      .eq('end_time', '00:00:00')
      .in('status', ['confirmed', 'in-progress']);

    // Check bookings that start at 23:30
    const { data: start2330Bookings, error: start2330Error } = await supabase
      .from('bookings')
      .select(`
        id,
        station_id,
        booking_date,
        start_time,
        end_time,
        status,
        customer_id,
        payment_txn_id,
        created_at,
        stations!inner(name)
      `)
      .eq('station_id', station_id)
      .eq('booking_date', booking_date)
      .eq('start_time', '23:30:00')
      .in('status', ['confirmed', 'in-progress']);

    return j({
      ok: true,
      station_id,
      booking_date,
      test_slot: {
        start_time: '23:30:00',
        end_time: '00:00:00'
      },
      overlap_check_result: overlapResult,
      overlap_check_error: overlapError,
      all_bookings: allBookings?.map(b => ({
        id: b.id,
        station_name: (b.stations as any)?.name,
        booking_date: b.booking_date,
        start_time: b.start_time,
        end_time: b.end_time,
        status: b.status,
        created_at: b.created_at,
        payment_txn_id: b.payment_txn_id,
      })) || [],
      active_bookings: activeBookings?.map(b => ({
        id: b.id,
        station_name: (b.stations as any)?.name,
        booking_date: b.booking_date,
        start_time: b.start_time,
        end_time: b.end_time,
        status: b.status,
        created_at: b.created_at,
        payment_txn_id: b.payment_txn_id,
      })) || [],
      midnight_bookings: midnightBookings?.map(b => ({
        id: b.id,
        station_name: (b.stations as any)?.name,
        booking_date: b.booking_date,
        start_time: b.start_time,
        end_time: b.end_time,
        status: b.status,
        created_at: b.created_at,
        payment_txn_id: b.payment_txn_id,
      })) || [],
      start_2330_bookings: start2330Bookings?.map(b => ({
        id: b.id,
        station_name: (b.stations as any)?.name,
        booking_date: b.booking_date,
        start_time: b.start_time,
        end_time: b.end_time,
        status: b.status,
        created_at: b.created_at,
        payment_txn_id: b.payment_txn_id,
      })) || [],
      errors: {
        all: allError,
        active: activeError,
        overlap: overlapError,
        midnight: midnightError,
        start2330: start2330Error,
      }
    });

  } catch (error: any) {
    console.error("💥 Error in debug-conflict:", error);
    return j({ 
      ok: false, 
      error: "Unexpected error",
      details: error.message
    }, 500);
  }
}
