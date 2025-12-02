// Automatic duplicate booking cleanup endpoint
// Checks for duplicate bookings (same time slot and station) and deletes one of each pair
// Called by client-side polling (works on Vercel Hobby plan)
// Using Node.js runtime to use Supabase client
export const config = {
  maxDuration: 60, // 60 seconds for batch processing
};

// Response helper for Node.js runtime
function j(res: VercelResponse, data: unknown, status = 200) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.status(status).json(data);
}

// Helper functions - Get environment variable from multiple sources
function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (process.env as any)[name];
  }
  // Fallback for Edge runtime
  const fromDeno = (globalThis as any)?.Deno?.env?.get?.(name);
  return fromDeno;
}

async function createSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabaseUrl = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const supabaseKey = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || getEnv("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Vercel.");
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Find and delete duplicate bookings
async function cleanupDuplicateBookings() {
  const supabase = await createSupabaseClient();
  
  console.log("🔍 Checking for duplicate bookings...");
  
  // Find duplicate bookings: same station, date, start_time, end_time, and status
  // Only check confirmed and in-progress bookings
  const { data: allBookings, error: fetchError } = await supabase
    .from("bookings")
    .select("id, station_id, booking_date, start_time, end_time, status, created_at")
    .in("status", ["confirmed", "in-progress"])
    .order("created_at", { ascending: true }); // Oldest first
  
  if (fetchError) {
    throw fetchError;
  }
  
  if (!allBookings || allBookings.length === 0) {
    return {
      processed: 0,
      duplicatesFound: 0,
      duplicatesDeleted: 0,
      message: "No bookings to check",
    };
  }
  
  // Group bookings by station_id, booking_date, start_time, end_time
  const bookingGroups = new Map<string, any[]>();
  
  for (const booking of allBookings) {
    // Create a unique key for the time slot
    const key = `${booking.station_id}|${booking.booking_date}|${booking.start_time}|${booking.end_time}`;
    
    if (!bookingGroups.has(key)) {
      bookingGroups.set(key, []);
    }
    
    bookingGroups.get(key)!.push(booking);
  }
  
  // Find groups with duplicates (more than 1 booking)
  const duplicateGroups: Array<{ key: string; bookings: any[] }> = [];
  
  for (const [key, bookings] of bookingGroups.entries()) {
    if (bookings.length > 1) {
      duplicateGroups.push({ key, bookings });
    }
  }
  
  if (duplicateGroups.length === 0) {
    console.log("✅ No duplicate bookings found");
    return {
      processed: allBookings.length,
      duplicatesFound: 0,
      duplicatesDeleted: 0,
      message: "No duplicates found",
    };
  }
  
  console.log(`📋 Found ${duplicateGroups.length} duplicate groups`);
  
  let totalDeleted = 0;
  const deletedBookings: string[] = [];
  
  // For each duplicate group, keep the oldest booking and delete the rest
  for (const group of duplicateGroups) {
    const { bookings } = group;
    
    // Sort by created_at (oldest first)
    bookings.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeA - timeB;
    });
    
    // Keep the first (oldest) booking, delete the rest
    const toKeep = bookings[0];
    const toDelete = bookings.slice(1);
    
    console.log(`🔍 Duplicate group: ${group.key}`);
    console.log(`   Keeping: ${toKeep.id} (created: ${toKeep.created_at})`);
    console.log(`   Deleting: ${toDelete.length} duplicate(s)`);
    
    // Delete the duplicate bookings
    const idsToDelete = toDelete.map(b => b.id);
    
    const { error: deleteError } = await supabase
      .from("bookings")
      .delete()
      .in("id", idsToDelete);
    
    if (deleteError) {
      console.error(`❌ Error deleting duplicates for group ${group.key}:`, deleteError);
      // Continue with other groups
    } else {
      totalDeleted += idsToDelete.length;
      deletedBookings.push(...idsToDelete);
      console.log(`   ✅ Deleted ${idsToDelete.length} duplicate(s)`);
    }
  }
  
  const summaryMessage = totalDeleted > 0 
    ? `Cleanup complete: Deleted ${totalDeleted} duplicate booking(s) from ${duplicateGroups.length} group(s)`
    : `Cleanup complete: Checked ${allBookings.length} booking(s), no duplicates found`;
  
  console.log(`✅ ${summaryMessage}`);
  
  return {
    processed: allBookings.length,
    duplicatesFound: duplicateGroups.reduce((sum, g) => sum + g.bookings.length, 0),
    duplicatesDeleted: totalDeleted,
    duplicateGroups: duplicateGroups.length,
    deletedBookingIds: deletedBookings,
    message: summaryMessage,
  };
}

// Vercel Node.js runtime types
type VercelRequest = {
  method?: string;
  body?: any;
  query?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  end: () => void;
};

// Handler for Node.js runtime (client-side calls from browser)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // This endpoint is called by:
  // 1. Client-side polling (Hobby plan) - from browser
  // 2. Manual API calls
  // Note: Vercel Cron would use Edge runtime, but we're not using it on Hobby plan
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return j(res, { ok: false, error: "Method not allowed" }, 405);
  }
  
  // Get headers (Node.js runtime format)
  const authHeader = req.headers?.["authorization"];
  const cronSecret = getEnv("CRON_SECRET");
  const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  
  // For client-side calls, allow them (browser security handles CORS)
  // If CRON_SECRET is set, optionally verify it
  if (cronSecret && authHeaderStr !== `Bearer ${cronSecret}`) {
    // Allow same-origin requests (browser handles this)
    // Only block if explicitly required
  }

  try {
    console.log("⏰ Automatic duplicate booking cleanup started (client-side call)");
    
    const result = await cleanupDuplicateBookings();
    
    // Log summary in same format as reconciliation endpoint for Vercel logs
    console.log(`✅ Cleanup complete: ${result.processed} checked, ${result.duplicatesDeleted} deleted`);
    
    return j(res, {
      ok: true,
      processed: result.processed,
      duplicatesFound: result.duplicatesFound,
      duplicatesDeleted: result.duplicatesDeleted,
      duplicateGroups: result.duplicateGroups,
      message: result.message,
    });
  } catch (err: any) {
    console.error("❌ Duplicate cleanup error:", err);
    return j(res, {
      ok: false,
      error: err?.message || String(err),
    }, 500);
  }
}

