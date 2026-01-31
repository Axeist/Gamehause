// Verify that the 23:59:59 migration has been applied
// This endpoint checks if get_available_slots returns slots ending at 23:59:59

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getEnv(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return (process.env as any)[name];
  }
  return undefined;
}

const supabaseUrl =
  getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');

// Server-only key. Do NOT use anon/publishable key here.
const supabaseServiceKey =
  getEnv('SUPABASE_SERVICE_ROLE_KEY') ||
  getEnv('SUPABASE_SERVICE_KEY') ||
  getEnv('SUPABASE_ADMIN_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase environment variables for verify-migration. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.'
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stationId = searchParams.get('station_id') || '51259b71-226e-428b-8509-636b0c6ccb22';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Call get_available_slots
    const { data: slots, error } = await supabase.rpc('get_available_slots', {
      p_date: date,
      p_station_id: stationId,
      p_slot_duration: 30
    });
    
    if (error) {
      return NextResponse.json({ 
        error: 'Failed to get slots', 
        details: error.message,
        migration_applied: false
      }, { status: 500 });
    }
    
    // Check if last slot ends at 23:59:59
    const lastSlot = slots && slots.length > 0 ? slots[slots.length - 1] : null;
    const lastSlotEnd = lastSlot?.end_time;
    const uses2359 = lastSlotEnd === '23:59:59' || lastSlotEnd === '23:59:59.000';
    const uses0000 = lastSlotEnd === '00:00:00' || lastSlotEnd === '00:00:00.000';
    
    // Get all bookings for this station/date to check for 00:00:00
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, start_time, end_time, status')
      .eq('station_id', stationId)
      .eq('booking_date', date)
      .in('status', ['confirmed', 'in-progress'])
      .limit(10);
    
    const bookingsWith0000 = bookings?.filter(b => 
      b.end_time === '00:00:00' || b.end_time === '00:00:00.000'
    ) || [];
    
    return NextResponse.json({
      migration_applied: uses2359,
      last_slot: lastSlot,
      last_slot_end_time: lastSlotEnd,
      uses_2359: uses2359,
      uses_0000: uses0000,
      total_slots: slots?.length || 0,
      existing_bookings_with_0000: bookingsWith0000.length,
      sample_bookings: bookings?.slice(0, 5).map(b => ({
        id: b.id,
        time: `${b.start_time}-${b.end_time}`,
        status: b.status
      })),
      message: uses2359 
        ? '✅ Migration applied - slots end at 23:59:59' 
        : uses0000
          ? '❌ Migration NOT applied - slots still end at 00:00:00'
          : '⚠️ Unknown state - check manually'
    });
  } catch (err: any) {
    return NextResponse.json({ 
      error: 'Error checking migration', 
      details: err.message 
    }, { status: 500 });
  }
}
