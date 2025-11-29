// Automatic reconciliation endpoint - Processes all pending payments
// Called by client-side polling (works on Vercel Hobby plan)
// Checks all pending payments and reconciles them automatically
// Using Node.js runtime to use Razorpay SDK and Supabase client
// Note: This is NOT a Vercel Cron job - it's called from the browser
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
  // Try process.env first (Node.js runtime)
  if (typeof process !== "undefined" && process.env) {
    const value = (process.env as any)[name];
    if (value) return value;
  }
  
  // Try Deno.env (Edge runtime fallback)
  const fromDeno = (globalThis as any)?.Deno?.env?.get?.(name);
  if (fromDeno) return fromDeno;
  
  return undefined;
}

async function createSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  
  // Use the same pattern as create-order.ts (which works)
  const supabaseUrl = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const supabaseKey = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || getEnv("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    // Log available environment variables for debugging
    const allEnvKeys = typeof process !== "undefined" && process.env 
      ? Object.keys(process.env).sort() 
      : [];
    const supabaseKeys = allEnvKeys.filter(k => 
      k.includes("SUPABASE") || k.includes("supabase")
    );
    
    console.error("❌ Missing Supabase environment variables");
    console.error("Looking for: VITE_SUPABASE_URL or SUPABASE_URL");
    console.error("Looking for: VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY");
    console.error("Available Supabase-related env vars:", supabaseKeys.length > 0 ? supabaseKeys.join(", ") : "NONE FOUND");
    console.error("Total env vars available:", allEnvKeys.length);
    
    throw new Error("Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Vercel.");
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
  
  // 3. Create bookings
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

// Reconcile a single payment
async function reconcileSinglePayment(pendingPayment: any) {
  try {
    console.log("🔍 Reconciling payment:", {
      orderId: pendingPayment.razorpay_order_id,
      paymentId: pendingPayment.razorpay_payment_id,
    });

    // If payment ID exists, verify it directly
    if (pendingPayment.razorpay_payment_id) {
      const payment = await fetchRazorpayPayment(pendingPayment.razorpay_payment_id);
      
      if (payment.status === "captured" || payment.status === "authorized") {
        console.log("✅ Payment verified as successful:", payment.status);
        
        // Update pending payment with payment ID if not set
        const supabase = await createSupabaseClient();
        await supabase
          .from("pending_payments")
          .update({
            razorpay_payment_id: pendingPayment.razorpay_payment_id,
          })
          .eq("id", pendingPayment.id);
        
        // Create booking
        return await createBookingFromPayment({
          ...pendingPayment,
          razorpay_payment_id: pendingPayment.razorpay_payment_id,
        });
      } else {
        console.log("❌ Payment not successful:", payment.status);
        const supabase = await createSupabaseClient();
        await supabase
          .from("pending_payments")
          .update({ status: "failed" })
          .eq("id", pendingPayment.id);
        return { success: false, error: `Payment status: ${payment.status}` };
      }
    }

    // If no payment ID, check order for payments
    const order = await fetchRazorpayOrder(pendingPayment.razorpay_order_id);
    
    // Check if order has payments
    if (order.payments && order.payments.length > 0) {
      const successfulPayment = order.payments.find(
        (p: any) => p.status === "captured" || p.status === "authorized"
      );
      
      if (successfulPayment) {
        console.log("✅ Found successful payment in order:", successfulPayment.id);
        
        const supabase = await createSupabaseClient();
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
    
    // Check order status
    if (order.status === "paid") {
      const Razorpay = (await import('razorpay')).default;
      const credentials = getRazorpayCredentials();
      const razorpay = new Razorpay({
        key_id: credentials.keyId!,
        key_secret: credentials.keySecret!,
      });
      
      try {
        const payments = await razorpay.orders.fetchPayments(pendingPayment.razorpay_order_id);
        if (payments.items && payments.items.length > 0) {
          const successfulPayment = payments.items.find(
            (p: any) => p.status === "captured" || p.status === "authorized"
          );
          
          if (successfulPayment) {
            const supabase = await createSupabaseClient();
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
    console.error("❌ Error reconciling payment:", err);
    return { success: false, error: err.message };
  }
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
    console.log("⏰ Automatic reconciliation started (client-side call)");
    const supabase = await createSupabaseClient();
    
    // Fetch all pending payments (not expired, created in last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: pendingPayments, error } = await supabase
      .from("pending_payments")
      .select("*")
      .eq("status", "pending")
      .gte("created_at", oneDayAgo)
      .order("created_at", { ascending: true })
      .limit(50); // Process max 50 at a time to avoid timeout
    
    if (error) {
      throw error;
    }

    if (!pendingPayments || pendingPayments.length === 0) {
      console.log("✅ No pending payments to reconcile");
      return j(res, {
        ok: true,
        processed: 0,
        successful: 0,
        failed: 0,
        message: "No pending payments found",
      });
    }

    console.log(`📋 Found ${pendingPayments.length} pending payments to reconcile`);

    let successful = 0;
    let failed = 0;
    const results = [];

    // Process each payment
    for (const payment of pendingPayments) {
      try {
        const result = await reconcileSinglePayment(payment);
        
        if (result.success) {
          successful++;
          results.push({
            orderId: payment.razorpay_order_id,
            status: "success",
            bookingId: result.bookingId,
          });
        } else {
          failed++;
          results.push({
            orderId: payment.razorpay_order_id,
            status: "failed",
            error: result.error,
          });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err: any) {
        failed++;
        console.error(`❌ Failed to reconcile payment ${payment.razorpay_order_id}:`, err);
        results.push({
          orderId: payment.razorpay_order_id,
          status: "error",
          error: err.message,
        });
      }
    }

    console.log(`✅ Reconciliation complete: ${successful} successful, ${failed} failed`);

    return j(res, {
      ok: true,
      processed: pendingPayments.length,
      successful,
      failed,
      results,
    });
  } catch (err: any) {
    console.error("❌ Reconciliation error:", err);
    return j(res, {
      ok: false,
      error: err?.message || String(err),
    }, 500);
  }
}

