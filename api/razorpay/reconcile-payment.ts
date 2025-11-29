// Reconciliation API - Verifies payment status with Razorpay and creates booking if successful
// This is the core solution: check Razorpay API directly instead of relying on webhooks
// Using Node.js runtime to use Razorpay SDK and Supabase client
export const config = {
  maxDuration: 30, // 30 seconds
};

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

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
}

function j(res: VercelResponse, data: unknown, status = 200) {
  setCorsHeaders(res);
  res.status(status).json(data);
}

// Helper functions
function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (process.env as any)[name];
  }
  return undefined;
}

async function createSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const supabaseKey = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || getEnv("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

function getRazorpayCredentials() {
  const mode = getEnv("RAZORPAY_MODE") || "test";
  const isLive = mode === "live";
  
  return {
    keyId: isLive
      ? (getEnv("RAZORPAY_KEY_ID_LIVE") || getEnv("RAZORPAY_KEY_ID"))
      : (getEnv("RAZORPAY_KEY_ID_TEST") || getEnv("RAZORPAY_KEY_ID")),
    keySecret: isLive
      ? (getEnv("RAZORPAY_KEY_SECRET_LIVE") || getEnv("RAZORPAY_KEY_SECRET"))
      : (getEnv("RAZORPAY_KEY_SECRET_TEST") || getEnv("RAZORPAY_KEY_SECRET")),
  };
}

async function fetchRazorpayPayment(paymentId: string) {
  const Razorpay = (await import('razorpay')).default;
  const credentials = getRazorpayCredentials();
  
  if (!credentials.keyId || !credentials.keySecret) {
    throw new Error("Missing Razorpay credentials");
  }
  
  const razorpay = new Razorpay({
    key_id: credentials.keyId,
    key_secret: credentials.keySecret,
  });
  
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (err: any) {
    console.error("❌ Failed to fetch Razorpay payment:", err);
    throw err;
  }
}

async function fetchRazorpayOrder(orderId: string) {
  const Razorpay = (await import('razorpay')).default;
  const credentials = getRazorpayCredentials();
  
  if (!credentials.keyId || !credentials.keySecret) {
    throw new Error("Missing Razorpay credentials");
  }
  
  const razorpay = new Razorpay({
    key_id: credentials.keyId,
    key_secret: credentials.keySecret,
  });
  
  try {
    const order = await razorpay.orders.fetch(orderId);
    return order;
  } catch (err: any) {
    console.error("❌ Failed to fetch Razorpay order:", err);
    throw err;
  }
}

function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

function generateCustomerID(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const phoneHash = normalized.slice(-4);
  return `CUE${phoneHash}${timestamp}`;
}

// Create booking from verified payment
async function createBookingFromPayment(pendingPayment: any) {
  const supabase = await createSupabaseClient();
  const bookingData = pendingPayment.booking_data;
  
  console.log("📦 Creating booking from verified payment:", {
    orderId: pendingPayment.razorpay_order_id,
    paymentId: pendingPayment.razorpay_payment_id,
  });
  
  // 1. Ensure customer exists
  let customerId = bookingData.customer?.id;
  if (!customerId) {
    const normalizedPhone = normalizePhoneNumber(bookingData.customer.phone);
    
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, name, custom_id")
      .eq("phone", normalizedPhone)
      .maybeSingle();
    
    if (existingCustomer) {
      customerId = existingCustomer.id;
      console.log("✅ Found existing customer:", customerId);
    } else {
      const customerID = generateCustomerID(normalizedPhone);
      const { data: created, error: cErr } = await supabase
        .from("customers")
        .insert({
          name: bookingData.customer.name,
          phone: normalizedPhone,
          email: bookingData.customer.email || null,
          custom_id: customerID,
          is_member: false,
          loyalty_points: 0,
          total_spent: 0,
          total_play_time: 0,
        })
        .select("id")
        .single();
      
      if (cErr) {
        if (cErr.code === '23505') {
          // Race condition - fetch again
          const { data: retryCustomer } = await supabase
            .from("customers")
            .select("id")
            .eq("phone", normalizedPhone)
            .maybeSingle();
          if (retryCustomer) {
            customerId = retryCustomer.id;
          } else {
            throw new Error("Customer creation failed: duplicate phone number");
          }
        } else {
          throw cErr;
        }
      } else {
        customerId = created!.id;
        console.log("✅ Created new customer:", customerId);
      }
    }
  }
  
  // 2. Check if booking already exists (idempotency)
  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id")
    .eq("payment_txn_id", pendingPayment.razorpay_payment_id)
    .maybeSingle();
  
  if (existingBooking) {
    console.log("✅ Booking already exists:", existingBooking.id);
    return { success: true, bookingId: existingBooking.id, alreadyExists: true };
  }
  
  // 3. Create bookings (one per station per slot)
  const rows: any[] = [];
  const totalBookings = bookingData.selectedStations.length * bookingData.slots.length;
  
  bookingData.selectedStations.forEach((station_id: string) => {
    bookingData.slots.forEach((slot: any) => {
      rows.push({
        station_id,
        customer_id: customerId!,
        booking_date: bookingData.selectedDateISO,
        start_time: slot.start_time,
        end_time: slot.end_time,
        duration: bookingData.duration,
        status: "confirmed",
        original_price: bookingData.pricing.original / totalBookings,
        discount_percentage: bookingData.pricing.discount > 0 
          ? (bookingData.pricing.discount / bookingData.pricing.original) * 100 
          : null,
        final_price: bookingData.pricing.final / totalBookings,
        coupon_code: bookingData.pricing.coupons || null,
        payment_mode: "razorpay",
        payment_txn_id: pendingPayment.razorpay_payment_id,
        notes: `Razorpay Order ID: ${pendingPayment.razorpay_order_id}`,
      });
    });
  });
  
  const { error: bErr, data: insertedBookings } = await supabase
    .from("bookings")
    .insert(rows)
    .select("id, station_id");
  
  if (bErr) {
    console.error("❌ Booking creation failed:", bErr);
    throw bErr;
  }
  
  console.log("✅ Booking created successfully:", insertedBookings?.length, "records");
  
  // 4. Update pending payment status
  await supabase
    .from("pending_payments")
    .update({
      status: "success",
      verified_at: new Date().toISOString(),
    })
    .eq("id", pendingPayment.id);
  
  return { success: true, bookingId: insertedBookings?.[0]?.id, alreadyExists: false };
}

// Main reconciliation function
async function reconcilePayment(orderId: string, paymentId?: string) {
  const supabase = await createSupabaseClient();
  
  console.log("🔍 Reconciling payment:", { orderId, paymentId });
  
  // 1. Find pending payment
  const { data: pendingPayment, error: findError } = await supabase
    .from("pending_payments")
    .select("*")
    .eq("razorpay_order_id", orderId)
    .eq("status", "pending")
    .maybeSingle();
  
  if (findError || !pendingPayment) {
    console.log("ℹ️ No pending payment found for order:", orderId);
    return { success: false, error: "No pending payment found" };
  }
  
  // 2. If payment ID provided, verify it directly
  if (paymentId) {
    try {
      const payment = await fetchRazorpayPayment(paymentId);
      
      if (payment.status === "captured" || payment.status === "authorized") {
        console.log("✅ Payment verified as successful:", payment.status);
        
        // Update pending payment with payment ID
        await supabase
          .from("pending_payments")
          .update({
            razorpay_payment_id: paymentId,
          })
          .eq("id", pendingPayment.id);
        
        // Create booking
        return await createBookingFromPayment({
          ...pendingPayment,
          razorpay_payment_id: paymentId,
        });
      } else {
        console.log("❌ Payment not successful:", payment.status);
        await supabase
          .from("pending_payments")
          .update({ status: "failed" })
          .eq("id", pendingPayment.id);
        return { success: false, error: `Payment status: ${payment.status}` };
      }
    } catch (err: any) {
      console.error("❌ Error verifying payment:", err);
      return { success: false, error: err.message };
    }
  }
  
  // 3. If no payment ID, check order for payments
  try {
    const order = await fetchRazorpayOrder(orderId);
    
    // Check if order has payments (payments can be array or string)
    const payments = Array.isArray(order.payments) ? order.payments : [];
    if (payments.length > 0) {
      const successfulPayment = payments.find(
        (p: any) => p.status === "captured" || p.status === "authorized"
      );
      
      if (successfulPayment) {
        console.log("✅ Found successful payment in order:", successfulPayment.id);
        
        // Update pending payment with payment ID
        await supabase
          .from("pending_payments")
          .update({
            razorpay_payment_id: successfulPayment.id,
          })
          .eq("id", pendingPayment.id);
        
        // Create booking
        return await createBookingFromPayment({
          ...pendingPayment,
          razorpay_payment_id: successfulPayment.id,
        });
      }
    }
    
    // Check order status
    if (order.status === "paid") {
      console.log("✅ Order is paid, but no payment ID found");
      // Try to fetch payments for this order
      const Razorpay = (await import('razorpay')).default;
      const credentials = getRazorpayCredentials();
      const razorpay = new Razorpay({
        key_id: credentials.keyId!,
        key_secret: credentials.keySecret!,
      });
      
      try {
        const payments = await razorpay.orders.fetchPayments(orderId);
        if (payments.items && payments.items.length > 0) {
          const successfulPayment = payments.items.find(
            (p: any) => p.status === "captured" || p.status === "authorized"
          );
          
          if (successfulPayment) {
            await supabase
              .from("pending_payments")
              .update({
                razorpay_payment_id: successfulPayment.id,
              })
              .eq("id", pendingPayment.id);
            
            return await createBookingFromPayment({
              ...pendingPayment,
              razorpay_payment_id: successfulPayment.id,
            });
          }
        }
      } catch (err) {
        console.error("❌ Error fetching payments for order:", err);
      }
    }
    
    return { success: false, error: "No successful payment found" };
  } catch (err: any) {
    console.error("❌ Error fetching order:", err);
    return { success: false, error: err.message };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return j(res, { ok: false, error: "Method not allowed" }, 405);
  }

  try {
    // In Vercel Node.js runtime, body is already parsed and available as req.body
    const payload = req.body || {};
    const { order_id, payment_id } = payload;

    if (!order_id) {
      return j(res, { ok: false, error: "order_id is required" }, 400);
    }

    console.log("📞 Reconciliation request:", { order_id, payment_id });

    const result = await reconcilePayment(order_id, payment_id);

    return j(res, {
      ok: result.success,
      success: result.success,
      bookingId: result.success ? (result as any).bookingId : undefined,
      alreadyExists: result.success ? (result as any).alreadyExists : undefined,
      error: result.success ? undefined : (result as any).error,
    });
  } catch (err: any) {
    console.error("❌ Reconciliation error:", err);
    return j(res, {
      ok: false,
      error: err?.message || String(err),
    }, 500);
  }
}

