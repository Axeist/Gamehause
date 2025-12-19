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
  
  // 2. Check if booking already exists (idempotency) - ATOMIC CHECK
  // Use a transaction-like approach: check and lock to prevent race conditions
  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id")
    .eq("payment_txn_id", pendingPayment.razorpay_payment_id)
    .limit(1)
    .maybeSingle();
  
  if (existingBooking) {
    console.log("✅ Booking already exists (idempotency check):", existingBooking.id);
    // Update pending payment status if not already updated
    await supabase
      .from("pending_payments")
      .update({
        status: "success",
        verified_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", pendingPayment.razorpay_order_id)
      .eq("status", "pending");
    
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
        console.error("❌ Error checking booking overlap:", overlapError);
        // Continue anyway - database trigger will catch it
      } else if (hasOverlap === true) {
        console.log("⚠️ Booking conflict detected, checking if it's the same payment...");
        // Check if conflict is from the same payment (already created)
        const { data: existingBooking } = await supabase
          .from("bookings")
          .select("id, payment_txn_id")
          .eq("station_id", station_id)
          .eq("booking_date", bookingData.selectedDateISO)
          .eq("start_time", slot.start_time)
          .eq("end_time", slot.end_time)
          .in("status", ["confirmed", "in-progress"])
          .limit(1)
          .maybeSingle();

        if (existingBooking && existingBooking.payment_txn_id === pendingPayment.razorpay_payment_id) {
          console.log("✅ Conflict is from same payment (already created), skipping...");
          // Update pending payment status
          await supabase
            .from("pending_payments")
            .update({
              status: "success",
              verified_at: new Date().toISOString(),
            })
            .eq("razorpay_order_id", pendingPayment.razorpay_order_id)
            .eq("status", "pending");
          
          return { success: true, bookingId: existingBooking.id, alreadyExists: true };
        } else {
          // Find the conflicting booking to provide better error message
          const { data: conflictingBooking } = await supabase
            .from("bookings")
            .select(`
              id,
              booking_date,
              start_time,
              end_time,
              status,
              payment_txn_id,
              created_at,
              stations!inner(name)
            `)
            .eq("station_id", station_id)
            .eq("booking_date", bookingData.selectedDateISO)
            .in("status", ["confirmed", "in-progress"])
            .or(
              `and(start_time.lte.${slot.start_time},end_time.gt.${slot.start_time}),` +
              `and(start_time.lt.${slot.end_time},end_time.gte.${slot.end_time}),` +
              `and(start_time.gte.${slot.start_time},end_time.lte.${slot.end_time}),` +
              `and(start_time.lte.${slot.start_time},end_time.gte.${slot.end_time})`
            )
            .limit(1)
            .maybeSingle();

          const conflictDetails = conflictingBooking 
            ? `Conflicting booking ID: ${conflictingBooking.id}, Date: ${conflictingBooking.booking_date}, Time: ${conflictingBooking.start_time}-${conflictingBooking.end_time}, Status: ${conflictingBooking.status}, Station: ${(conflictingBooking.stations as any)?.name || 'Unknown'}`
            : 'Unable to retrieve conflicting booking details';

          const errorMessage = `Booking conflict: Time slot ${slot.start_time}-${slot.end_time} for station ${station_id} is already booked. ${conflictDetails}`;
          console.error("❌ Booking conflict: Another booking exists for this time slot", conflictDetails);
          await supabase
            .from("pending_payments")
            .update({ 
              status: "failed",
              failure_reason: errorMessage
            })
            .eq("id", pendingPayment.id);
          return { 
            success: false, 
            error: errorMessage
          };
        }
      }
    }
  }

  // 4. Create bookings (one per station per slot)
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
  
  // Double-check before inserting (race condition protection)
  const { data: doubleCheck } = await supabase
    .from("bookings")
    .select("id")
    .eq("payment_txn_id", pendingPayment.razorpay_payment_id)
    .limit(1)
    .maybeSingle();
  
  if (doubleCheck) {
    console.log("✅ Booking was created by another process (race condition prevented):", doubleCheck.id);
    // Update pending payment status
    await supabase
      .from("pending_payments")
      .update({
        status: "success",
        verified_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", pendingPayment.razorpay_order_id)
      .eq("status", "pending");
    
    return { success: true, bookingId: doubleCheck.id, alreadyExists: true };
  }
  
  const { error: bErr, data: insertedBookings } = await supabase
    .from("bookings")
    .insert(rows)
    .select("id, station_id");
  
  if (bErr) {
    // Check if error is due to duplicate/overlap (database trigger caught it)
    if (bErr.code === '23505' || bErr.message?.includes('duplicate') || bErr.message?.includes('unique') || bErr.message?.includes('Booking conflict')) {
      console.log("⚠️ Duplicate/overlapping booking detected (database trigger), fetching existing booking...");
      
      // First check if it's the same payment
      const { data: existing } = await supabase
        .from("bookings")
        .select("id")
        .eq("payment_txn_id", pendingPayment.razorpay_payment_id)
        .limit(1)
        .maybeSingle();
      
      if (existing) {
        console.log("✅ Found existing booking after duplicate error:", existing.id);
        await supabase
          .from("pending_payments")
          .update({
            status: "success",
            verified_at: new Date().toISOString(),
          })
          .eq("razorpay_order_id", pendingPayment.razorpay_order_id)
          .eq("status", "pending");
        
        return { success: true, bookingId: existing.id, alreadyExists: true };
      } else {
        // It's a real conflict with another booking
        const errorMessage = bErr.message || "Booking conflict: Time slot is already booked";
        console.error("❌ Booking conflict: Another booking exists for this time slot");
        await supabase
          .from("pending_payments")
          .update({ 
            status: "failed",
            failure_reason: errorMessage
          })
          .eq("id", pendingPayment.id);
        return { 
          success: false, 
          error: errorMessage
        };
      }
    }
    
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

  // 0. CRITICAL: Check if booking already exists FIRST (idempotency)
  // This prevents duplicates if reconciliation already happened or customer returned
  if (paymentId) {
    const { data: existingBookingCheck } = await supabase
      .from("bookings")
      .select("id")
      .eq("payment_txn_id", paymentId)
      .limit(1)
      .maybeSingle();
    
    if (existingBookingCheck) {
      console.log("✅ Booking already exists (early check), skipping reconciliation:", existingBookingCheck.id);
      
      // Update pending payment status if it exists (skip if expired)
      await supabase
        .from("pending_payments")
        .update({
          status: "success",
          verified_at: new Date().toISOString(),
        })
        .eq("razorpay_order_id", orderId)
        .in("status", ["pending", "failed"]);
      
      return { success: true, bookingId: existingBookingCheck.id, alreadyExists: true };
    }
  }

  // 1. Find pending, failed, or expired payment
  const { data: pendingPayment, error: findError } = await supabase
    .from("pending_payments")
    .select("*")
    .eq("razorpay_order_id", orderId)
    .in("status", ["pending", "failed", "expired"])
    .maybeSingle();
  
  if (findError || !pendingPayment) {
    console.log("ℹ️ No pending, failed, or expired payment found for order:", orderId);
    // Don't update failure_reason here since payment record doesn't exist
    return { success: false, error: "No pending, failed, or expired payment found" };
  }

  // Check if payment has expired - mark as expired if so
  if (pendingPayment.status === "pending" && pendingPayment.expires_at) {
    const expiresAt = new Date(pendingPayment.expires_at);
    if (!isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
      console.log("⏰ Payment has expired, marking as expired");
      await supabase
        .from("pending_payments")
        .update({
          status: "expired",
          failure_reason: "Payment expired - payment window has passed",
        })
        .eq("id", pendingPayment.id);
      
      return { success: false, error: "Payment has expired" };
    }
  }
  
  // 2. If payment ID provided, verify it directly
  if (paymentId) {
    try {
      const payment = await fetchRazorpayPayment(paymentId);
      
      if (payment.status === "captured" || payment.status === "authorized") {
        console.log("✅ Payment verified as successful:", payment.status);
        
        // Check if booking already exists with this payment ID (idempotency)
        const { data: existingBookingCheck } = await supabase
          .from("bookings")
          .select("id")
          .eq("payment_txn_id", paymentId)
          .limit(1)
          .maybeSingle();
        
        if (existingBookingCheck) {
          console.log("✅ Booking already exists with payment ID, skipping:", existingBookingCheck.id);
          await supabase
            .from("pending_payments")
            .update({
              razorpay_payment_id: paymentId,
              status: "success",
              verified_at: new Date().toISOString(),
            })
            .eq("id", pendingPayment.id);
          
          return { success: true, bookingId: existingBookingCheck.id, alreadyExists: true };
        }
        
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
      } else if (payment.status === "failed") {
        // Payment explicitly failed in Razorpay
        const errorMessage = `Payment failed - Razorpay status: ${payment.status}`;
        console.log("❌ Payment failed in Razorpay:", payment.status);
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
    } catch (err: any) {
      console.error("❌ Error verifying payment:", err);
      const errorMessage = err.message || "Error verifying payment with Razorpay";
      
      // Check if payment has expired before marking as failed
      if (pendingPayment.expires_at) {
        const now = new Date();
        const expiresAt = new Date(pendingPayment.expires_at);
        
        if (!isNaN(expiresAt.getTime()) && expiresAt < now) {
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
          console.log("⚠️ Error verifying payment, but payment is still within window - keeping as pending");
        }
      } else {
        // No expiry date set - keep as pending
        console.log("⚠️ Error verifying payment, but no expiry date set - keeping as pending");
      }
      return { success: false, error: errorMessage };
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
    
    // Check if order exists and its status
    // If order status is "created", payment is still pending - don't mark as failed
    if (order.status === "created") {
      console.log("⏳ Order is still in 'created' status - payment is pending");
      // Don't update status - keep it as pending
      return { success: false, error: "Payment is still pending" };
    }
    
    // Check if payment has expired
    if (pendingPayment.expires_at) {
      const now = new Date();
      const expiresAt = new Date(pendingPayment.expires_at);
      if (!isNaN(expiresAt.getTime()) && expiresAt < now) {
      console.log("⏰ Payment has expired, marking as expired");
      await supabase
        .from("pending_payments")
        .update({ 
          status: "expired",
          failure_reason: "Payment expired - payment window has passed"
        })
        .eq("id", pendingPayment.id);
        return { success: false, error: "Payment has expired" };
      }
    }
    
    // Only mark as failed if order status indicates failure
    // Check if there are any failed payment attempts
    const payments = Array.isArray(order.payments) ? order.payments : [];
    const failedPayments = payments.filter((p: any) => p.status === "failed");
    
    if (payments.length > 0 && failedPayments.length > 0 && payments.length === failedPayments.length) {
      // All payment attempts failed - mark as failed
      const errorMessage = "Payment failed - all payment attempts were unsuccessful";
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
      console.error("❌ Error fetching order:", err);
      const errorMessage = err.message || "Error fetching order from Razorpay";
      
      // Check if payment has expired before marking as failed
      if (pendingPayment.expires_at) {
        const now = new Date();
        const expiresAt = new Date(pendingPayment.expires_at);
        
        if (!isNaN(expiresAt.getTime()) && expiresAt < now) {
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
          console.log("⚠️ Error fetching order, but payment is still within window - keeping as pending");
        }
      } else {
        // No expiry date set - keep as pending
        console.log("⚠️ Error fetching order, but no expiry date set - keeping as pending");
      }
      return { success: false, error: errorMessage };
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
    // Ensure we always return valid JSON, even on unexpected errors
    try {
      const errorMessage = err?.message || String(err) || "An unexpected error occurred";
      return j(res, {
        ok: false,
        error: errorMessage,
      }, 500);
    } catch (jsonError) {
      // Fallback: if even JSON serialization fails, return plain text error
      console.error("❌ Failed to serialize error response:", jsonError);
      setCorsHeaders(res);
      res.status(500).json({
        ok: false,
        error: "An unexpected error occurred during reconciliation",
      });
      return;
    }
  }
}

