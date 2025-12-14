# Fix for Midnight Booking Slot Issue (23:30-00:00)

## Problem
Bookings for the time slot 23:30:00-00:00:00 (11:30 PM - 12:00 AM) are incorrectly showing as "already booked" even when no booking exists.

## Root Cause
The `check_booking_overlap` database function and client-side validation queries don't properly handle midnight (00:00:00) as the end of day. In TIME comparisons, `00:00:00 < 23:30:00`, which breaks the overlap detection logic.

## Solution

### 1. Database Migration (REQUIRED)
Run the migration file: `supabase/migrations/20250131000001_prevent_duplicate_bookings.sql`

This updates the `check_booking_overlap` function to properly handle midnight:
- When `end_time = 00:00:00`, treat it as end of day (24:00:00)
- Updated all overlap cases to account for midnight

### 2. Code Changes (Already Applied)
- ✅ Updated `src/utils/bookingValidation.ts` - Uses database function and filters in JavaScript
- ✅ Updated `api/bookings/create.ts` - Fixed conflict detection query
- ✅ Updated `api/razorpay/reconcile-payment.ts` - Improved error messages

### 3. Diagnostic Tools
- Created `api/bookings/find-conflict.ts` - Find conflicting bookings
- Created `api/bookings/debug-conflict.ts` - Debug tool to see all bookings for a station/date

## How to Apply the Fix

### Step 1: Apply Database Migration
```bash
# If using Supabase CLI locally
supabase migration up

# Or apply directly in Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of supabase/migrations/20250131000001_prevent_duplicate_bookings.sql
# 3. Run the SQL
```

### Step 2: Verify the Fix
1. Try booking the 23:30-00:00 slot again
2. If it still fails, use the debug endpoint:
```bash
POST /api/bookings/debug-conflict
{
  "station_id": "51259b71-226e-428b-8509-636b0c6ccb22",
  "booking_date": "2025-12-14"  # Use the actual date
}
```

### Step 3: Check for Existing Problematic Bookings
If the migration is applied but you still can't book, there might be a booking with status 'confirmed' or 'in-progress' that's blocking it. Use the debug endpoint to find it, then either:
- Cancel the booking if it's invalid
- Update its status if it should be 'completed' or 'cancelled'

## Testing
After applying the migration, test:
1. ✅ Book 23:30-00:00 slot when it's actually free
2. ✅ Book 23:30-00:00 slot when there's a real conflict (should still block)
3. ✅ Book other time slots to ensure nothing broke

## Notes
- The migration updates the existing `check_booking_overlap` function (uses `CREATE OR REPLACE`)
- All existing bookings remain unchanged
- The fix is backward compatible
