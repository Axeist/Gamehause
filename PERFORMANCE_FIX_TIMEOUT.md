# Performance Fix: Statement Timeout Error

## Problem
The `get_available_slots` function is timing out with error: "canceling statement due to statement timeout"

## Root Cause
The function was doing a separate database query for EACH slot (26+ queries for 30-minute slots). This is extremely inefficient and causes timeouts.

## Solution
Created optimized version that:
1. **Fetches all bookings ONCE** in a CTE
2. **Fetches active session ONCE** (if today)
3. **Generates all slots** using `generate_series`
4. **Checks overlaps** using the pre-fetched data

This reduces 26+ queries to just 2-3 queries total.

## Migration to Apply

**Apply BOTH migrations in order:**

1. **First**: `supabase/migrations/20250131000005_change_last_slot_to_2359.sql`
   - Changes last slot to 23:59:59
   - Simplifies overlap detection

2. **Then**: `supabase/migrations/20250131000006_optimize_get_available_slots.sql`
   - **PERFORMANCE FIX** - Optimizes the function to prevent timeouts

## How to Apply

```sql
-- In Supabase Dashboard > SQL Editor, run BOTH migrations:
-- 1. 20250131000005_change_last_slot_to_2359.sql
-- 2. 20250131000006_optimize_get_available_slots.sql
```

## Performance Improvement

- **Before**: 26+ separate queries (one per slot)
- **After**: 2-3 queries total (fetch bookings once, fetch session once, generate slots)
- **Result**: Should complete in < 1 second instead of timing out

## Verification

After applying, test:
1. Select a date in the calendar
2. Time slots should load quickly (< 2 seconds)
3. No timeout errors
