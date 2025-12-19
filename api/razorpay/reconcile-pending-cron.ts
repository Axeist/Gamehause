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
// Use exact same pattern as create-order.ts (which works)
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
  
  // Use the same pattern as create-order.ts (which works)
  const supabaseUrl = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const supabaseKey = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || getEnv("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    // Log available environment variables for debugging
    const allEnvKeys = typeof process !== "undefined" && process.env 
      ? Object.keys(process.env).sort() 
      : [];
    const supabaseKeys = allEnvKeys.filter(k => 
      k.includes("SUPABASE") || k.includes("supabase") || k.includes("SUPABASE")
    );
    
    // Log first 20 env var names to see what's available
    const sampleKeys = allEnvKeys.slice(0, 20);
    
    console.error("❌ Missing Supabase environment variables");
    console.error("Looking for: VITE_SUPABASE_URL or SUPABASE_URL");
    console.error("Looking for: VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY");
    console.error("Available Supabase-related env vars:", supabaseKeys.length > 0 ? supabaseKeys.join(", ") : "NONE FOUND");
    console.error("Sample env var names (first 20):", sampleKeys.join(", "));
    console.error("Total env vars available:", allEnvKeys.length);
    
    // Try to find any URL or KEY variables that might be Supabase
    const urlVars = allEnvKeys.filter(k => k.includes("URL") && !k.includes("RAZORPAY"));
    const keyVars = allEnvKeys.filter(k => (k.includes("KEY") || k.includes("SECRET")) && !k.includes("RAZORPAY"));
    
    if (urlVars.length > 0) {
      console.error("Found URL variables:", urlVars.join(", "));
    }
    if (keyVars.length > 0) {
      console.error("Found KEY/SECRET variables:", keyVars.join(", "));
    }
    
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
  
  // 3. Validate booking slots for conflicts BEFORE creating
  for (const station_id of bookingData.selectedStations) {
    for (const slot of bookingData.slots) {
      const { data: hasOverlap, error: overlapError } = await (supabase as any).rpc('check_booking_overlap', {
        p_station_id: station_id,
        p_booking_date: bookingData.selectedDateISO,
        p_start_time: slot.start_time,
        p_end_time: slot.end_time,
        p_exclude_booking_id: null,
      });

      if (overlapError) {
        console.error("Error checking booking overlap:", overlapError);
        // Continue - database trigger will catch it
      } else if (hasOverlap === true) {
        // Check if it's the same payment
        const { data: existingBooking } = await supabase
          .from("bookings")
          .select("id, payment_txn_id")
          .eq("station_id", station_id)
          .eq("booking_date", bookingData.selectedDateISO)
          .eq("start_time", slot.start_time)
          .eq("end_time", slot.end_time)
          .eq("payment_txn_id", pendingPayment.razorpay_payment_id)
          .in("status", ["confirmed", "in-progress"])
          .limit(1)
          .maybeSingle();

        if (existingBooking) {
          // Same payment, booking already exists
          console.log("✅ Booking already exists for this payment in cron");
          await supabase
            .from("pending_payments")
            .update({
              status: "success",
              verified_at: new Date().toISOString(),
            })
            .eq("id", pendingPayment.id);
          return { success: true, bookingId: existingBooking.id, alreadyExists: true };
        } else {
          // Real conflict
          const errorMessage = "Booking conflict: Time slot is already booked";
          console.error("❌ Booking conflict in cron: Another booking exists");
          await supabase
            .from("pending_payments")
            .update({ 
              status: "failed",
              failure_reason: errorMessage
            })
            .eq("id", pendingPayment.id);
          return { success: false, error: errorMessage };
        }
      }
    }
  }

  // 4. Create bookings
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
    // Check if error is due to booking conflict
    if (bErr.code === '23505' || bErr.message?.includes('Booking conflict')) {
      const errorMessage = "Booking conflict: Time slot is already booked";
      console.error("❌ Booking conflict detected by database trigger in cron");
      await supabase
        .from("pending_payments")
        .update({ 
          status: "failed",
          failure_reason: errorMessage
        })
        .eq("id", pendingPayment.id);
      return { success: false, error: errorMessage };
    }
    // For other booking creation errors, update failure_reason
    const errorMessage = bErr.message || "Booking creation failed";
    console.error("❌ Booking creation failed:", bErr);
    await supabase
      .from("pending_payments")
      .update({ 
        status: "failed",
        failure_reason: errorMessage
      })
      .eq("id", pendingPayment.id);
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

    // 0. CRITICAL: Check if booking already exists FIRST (idempotency)
    // This prevents duplicates if customer returned and created booking, or if reconciliation already ran
    if (pendingPayment.razorpay_payment_id) {
      const supabase = await createSupabaseClient();
      const { data: existingBookingCheck } = await supabase
        .from("bookings")
        .select("id")
        .eq("payment_txn_id", pendingPayment.razorpay_payment_id)
        .limit(1)
        .maybeSingle();
      
      if (existingBookingCheck) {
        console.log("✅ Booking already exists (early check in cron), skipping:", existingBookingCheck.id);
        
        // Update pending payment status - INCLUDING expired payments
        // This fixes the issue where expired payments with successful bookings show as expired
        await supabase
          .from("pending_payments")
          .update({
            status: "success",
            verified_at: new Date().toISOString(),
          })
          .eq("id", pendingPayment.id)
          .in("status", ["pending", "failed", "expired"]);
        
        return { success: true, bookingId: existingBookingCheck.id, alreadyExists: true };
      }
    }

    // If payment ID exists, verify it directly
    if (pendingPayment.razorpay_payment_id) {
      const payment = await fetchRazorpayPayment(pendingPayment.razorpay_payment_id);
      
      if (payment.status === "captured" || payment.status === "authorized") {
        console.log("✅ Payment verified as successful:", payment.status);
        
        // Update pending payment with payment ID if not set
        const supabase = await createSupabaseClient();
        
        // Check if booking already exists with this payment ID (idempotency)
        const { data: existingBookingCheck } = await supabase
          .from("bookings")
          .select("id")
          .eq("payment_txn_id", pendingPayment.razorpay_payment_id)
          .limit(1)
          .maybeSingle();
        
        if (existingBookingCheck) {
          console.log("✅ Booking already exists with payment ID, skipping:", existingBookingCheck.id);
          await supabase
            .from("pending_payments")
            .update({
              razorpay_payment_id: pendingPayment.razorpay_payment_id,
              status: "success",
              verified_at: new Date().toISOString(),
            })
            .eq("id", pendingPayment.id);
          
          return { success: true, bookingId: existingBookingCheck.id, alreadyExists: true };
        }
        
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
      } else if (payment.status === "failed") {
        // Payment explicitly failed in Razorpay
        const errorMessage = `Payment failed - Razorpay status: ${payment.status}`;
        console.log("❌ Payment failed in Razorpay:", payment.status);
        const supabase = await createSupabaseClient();
        await supabase
          .from("pending_payments")
          .update({ 
            status: "failed",
            failure_reason: errorMessage
          })
          .eq("id", pendingPayment.id);
        return { success: false, error: errorMessage };
      } else {
        // Payment is in a pending state (created, authorized, etc.) - keep as pending
        console.log("⏳ Payment status is:", payment.status, "- keeping as pending");
        // Don't update status - keep it as pending
        return { success: false, error: `Payment is still processing - status: ${payment.status}` };
      }
    }

    // If no payment ID, check order for payments
    const order = await fetchRazorpayOrder(pendingPayment.razorpay_order_id);
    
    // Check if order has payments (payments can be array or string)
    const payments = Array.isArray(order.payments) ? order.payments : [];
    if (payments.length > 0) {
      const successfulPayment = payments.find(
        (p: any) => p.status === "captured" || p.status === "authorized"
      );
      
      if (successfulPayment) {
        console.log("✅ Found successful payment in order:", successfulPayment.id);
        
        const supabase = await createSupabaseClient();
        
        // Check if booking already exists with this payment ID (idempotency)
        const { data: existingBookingCheck } = await supabase
          .from("bookings")
          .select("id")
          .eq("payment_txn_id", successfulPayment.id)
          .limit(1)
          .maybeSingle();
        
        if (existingBookingCheck) {
          console.log("✅ Booking already exists with payment ID, skipping:", existingBookingCheck.id);
          await supabase
            .from("pending_payments")
            .update({
              razorpay_payment_id: successfulPayment.id,
              status: "success",
              verified_at: new Date().toISOString(),
            })
            .eq("id", pendingPayment.id);
          
          return { success: true, bookingId: existingBookingCheck.id, alreadyExists: true };
        }
        
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
        const paymentsResponse = await razorpay.orders.fetchPayments(pendingPayment.razorpay_order_id);
        if (paymentsResponse.items && paymentsResponse.items.length > 0) {
          const successfulPayment = paymentsResponse.items.find(
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
    
    // Check if order exists and its status
    // If order status is "created", payment is still pending - don't mark as failed
    if (order.status === "created") {
      console.log("⏳ Order is still in 'created' status - payment is pending");
      // Don't update status - keep it as pending
      return { success: false, error: "Payment is still pending" };
    }
    
    // Check if payment has expired
    const now = new Date();
    const expiresAt = new Date(pendingPayment.expires_at);
    if (expiresAt < now) {
      console.log("⏰ Payment has expired, marking as expired");
      const supabase = await createSupabaseClient();
      await supabase
        .from("pending_payments")
        .update({ 
          status: "expired",
          failure_reason: "Payment expired - payment window has passed"
        })
        .eq("id", pendingPayment.id);
      return { success: false, error: "Payment has expired" };
    }
    
    // Only mark as failed if all payment attempts have failed
    // Check if there are any failed payment attempts
    // Reuse payments variable already declared above (line 449)
    const failedPayments = payments.filter((p: any) => p.status === "failed");
    
    if (payments.length > 0 && failedPayments.length > 0 && payments.length === failedPayments.length) {
      // All payment attempts failed - mark as failed
      const errorMessage = "Payment failed - all payment attempts were unsuccessful";
      const supabase = await createSupabaseClient();
      await supabase
        .from("pending_payments")
        .update({ 
          status: "failed",
          failure_reason: errorMessage
        })
        .eq("id", pendingPayment.id);
      return { success: false, error: errorMessage };
    }
    
    // If we get here, payment is still pending - don't change status
    console.log("ℹ️ No successful payment found, but payment is still pending");
    return { success: false, error: "Payment is still pending - no successful payment found yet" };
  } catch (err: any) {
    console.error("❌ Error reconciling payment:", err);
    const errorMessage = err.message || "Error reconciling payment";
    
    // Check if payment has expired before marking as failed
    const now = new Date();
    const expiresAt = new Date(pendingPayment.expires_at);
    
    try {
      const supabase = await createSupabaseClient();
      if (expiresAt < now) {
        // Payment expired
        await supabase
          .from("pending_payments")
          .update({ 
            status: "expired",
            failure_reason: "Payment expired - payment window has passed"
          })
          .eq("id", pendingPayment.id);
      } else {
        // Don't mark as failed if payment hasn't expired - keep as pending
        console.log("⚠️ Error during reconciliation, but payment is still within window - keeping as pending");
      }
    } catch (updateErr) {
      console.error("❌ Failed to update status:", updateErr);
    }
    return { success: false, error: errorMessage };
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
    
    // First, check expired pending payments for existing bookings
    // If bookings exist, update to success instead of marking as expired
    const now = new Date().toISOString();
    const { data: expiredPendingPayments } = await supabase
      .from("pending_payments")
      .select("id, razorpay_order_id, razorpay_payment_id")
      .eq("status", "pending")
      .lt("expires_at", now)
      .limit(100);
    
    if (expiredPendingPayments && expiredPendingPayments.length > 0) {
      for (const payment of expiredPendingPayments) {
        // Check if booking exists for this payment
        let hasBooking = false;
        
        // Check by payment ID if available
        if (payment.razorpay_payment_id) {
          const { data: bookingByPaymentId } = await supabase
            .from("bookings")
            .select("id")
            .eq("payment_txn_id", payment.razorpay_payment_id)
            .limit(1)
            .maybeSingle();
          
          if (bookingByPaymentId) {
            hasBooking = true;
          }
        }
        
        // Also check by order ID in notes
        if (!hasBooking) {
          const { data: bookingByOrderId } = await supabase
            .from("bookings")
            .select("id")
            .ilike("notes", `%Razorpay Order ID: ${payment.razorpay_order_id}%`)
            .limit(1)
            .maybeSingle();
          
          if (bookingByOrderId) {
            hasBooking = true;
          }
        }
        
        if (hasBooking) {
          // Booking exists, update to success instead of expired
          await supabase
            .from("pending_payments")
            .update({
              status: "success",
              verified_at: now,
            })
            .eq("id", payment.id);
        } else {
          // No booking exists, mark as expired
          await supabase
            .from("pending_payments")
            .update({
              status: "expired",
              failure_reason: "Payment expired - payment window has passed",
            })
            .eq("id", payment.id);
        }
      }
    }
    
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
            bookingId: (result as any).bookingId,
          });
        } else {
          failed++;
          results.push({
            orderId: payment.razorpay_order_id,
            status: "failed",
            error: (result as any).error,
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

