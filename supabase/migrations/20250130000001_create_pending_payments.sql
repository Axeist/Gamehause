-- Create pending_payments table to store payment intents
-- This allows us to track payments and reconcile them even if customer doesn't return to browser

CREATE TABLE IF NOT EXISTS public.pending_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'expired')),
  
  -- Booking data stored as JSON
  booking_data JSONB NOT NULL,
  
  -- Customer info
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  
  -- Metadata
  notes TEXT,
  
  -- Indexes for faster queries
  CONSTRAINT pending_payments_razorpay_order_id_key UNIQUE (razorpay_order_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_payments_status ON public.pending_payments(status);
CREATE INDEX IF NOT EXISTS idx_pending_payments_razorpay_order_id ON public.pending_payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_razorpay_payment_id ON public.pending_payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pending_payments_created_at ON public.pending_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_payments_expires_at ON public.pending_payments(expires_at);

-- Add comments for documentation
COMMENT ON TABLE public.pending_payments IS 'Stores payment intents for reconciliation. Payments are verified against Razorpay API to create bookings even if customer doesnt return to browser.';
COMMENT ON COLUMN public.pending_payments.status IS 'Payment status: pending (awaiting payment), success (payment verified), failed (payment failed), expired (payment expired)';
COMMENT ON COLUMN public.pending_payments.booking_data IS 'Complete booking data stored as JSON for creating booking when payment is verified';
COMMENT ON COLUMN public.pending_payments.expires_at IS 'Payment intent expires after 30 minutes if not completed';

-- Enable RLS (Row Level Security)
ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read/write (for public booking page)
CREATE POLICY "Allow public read/write on pending_payments"
  ON public.pending_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

