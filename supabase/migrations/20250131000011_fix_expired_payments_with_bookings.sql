-- Fix expired payments that have successful bookings
-- This migration updates expired payments to "success" status if corresponding bookings exist
-- This fixes the issue where successful payments were incorrectly marked as expired

-- Update expired payments that have bookings by payment_txn_id
UPDATE public.pending_payments pp
SET 
  status = 'success',
  verified_at = COALESCE(pp.verified_at, NOW())
WHERE pp.status = 'expired'
  AND pp.razorpay_payment_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.payment_txn_id = pp.razorpay_payment_id
      AND b.payment_mode = 'razorpay'
  );

-- Update expired payments that have bookings by order ID in notes
-- This handles cases where payment_id wasn't stored but booking has order ID in notes
-- Note: This will skip payments already updated by the first query (status != 'expired')
UPDATE public.pending_payments pp
SET 
  status = 'success',
  verified_at = COALESCE(pp.verified_at, NOW())
WHERE pp.status = 'expired'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.notes LIKE '%Razorpay Order ID: ' || pp.razorpay_order_id || '%'
      AND b.payment_mode = 'razorpay'
  );

-- Update failure_reason to null for payments that were incorrectly marked as expired
UPDATE public.pending_payments
SET failure_reason = NULL
WHERE status = 'success'
  AND failure_reason LIKE '%Payment expired%';

