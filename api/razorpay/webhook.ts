// Using Node.js runtime to use Razorpay SDK and Supabase client
export const config = {
  maxDuration: 30, // 30 seconds
};

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, x-razorpay-signature",
    },
  });
}

// Create Supabase client for Node.js runtime
async function createSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const supabaseKey = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || getEnv("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Get Razorpay credentials for fetching order
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

// Fetch order from Razorpay to get booking data from notes
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

// Extract booking data from order notes
function extractBookingData(orderNotes: any): any | null {
  if (!orderNotes) return null;
  
  try {
    // Check if booking data is in a single field
    if (orderNotes.booking_data) {
      // Handle both string and Buffer
      const base64Data = typeof orderNotes.booking_data === 'string' 
        ? orderNotes.booking_data 
        : Buffer.from(orderNotes.booking_data).toString('base64');
      const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    }
    
    // Check if booking data is split across multiple fields
    if (orderNotes.booking_data_chunks) {
      const chunks = parseInt(orderNotes.booking_data_chunks);
      let bookingDataBase64 = '';
      for (let i = 0; i < chunks; i++) {
        bookingDataBase64 += orderNotes[`booking_data_${i}`] || '';
      }
      if (bookingDataBase64) {
        const decoded = Buffer.from(bookingDataBase64, 'base64').toString('utf-8');
        return JSON.parse(decoded);
      }
    }
  } catch (err) {
    console.error("❌ Failed to extract booking data from notes:", err);
  }
  
  return null;
}

// Normalize phone number (removes all non-digit characters)
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Generate unique Customer ID
function generateCustomerID(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const phoneHash = normalized.slice(-4);
  return `CUE${phoneHash}${timestamp}`;
}

// Create booking from webhook
async function createBookingFromWebhook(paymentId: string, orderId: string, bookingData: any) {
  const supabase = await createSupabaseClient();
  
  console.log("📦 Creating booking from webhook:", { paymentId, orderId });
  
  // 1. Ensure customer exists
  let customerId = bookingData.customer?.id;
  if (!customerId) {
    const normalizedPhone = normalizePhoneNumber(bookingData.customer.phone);
    
    // Check if customer exists
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, name, custom_id")
      .eq("phone", normalizedPhone)
      .maybeSingle();
    
    if (existingCustomer) {
      customerId = existingCustomer.id;
      console.log("✅ Found existing customer:", customerId);
    } else {
      // Create new customer
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
        // Handle duplicate phone number error
        if (cErr.code === '23505') {
          // Try to fetch again in case of race condition
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
  
  // 2. Check if booking already exists (idempotency check)
  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id")
    .eq("payment_txn_id", paymentId)
    .maybeSingle();
  
  if (existingBooking) {
    console.log("✅ Booking already exists (idempotency):", existingBooking.id);
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
        payment_txn_id: paymentId,
        notes: `Razorpay Order ID: ${orderId}`,
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
  
  console.log("✅ Booking created successfully from webhook:", insertedBookings?.length, "records");
  
  return { success: true, bookingId: insertedBookings?.[0]?.id, alreadyExists: false };
}


// Get Razorpay webhook secret (optional but highly recommended for security)
function getRazorpayWebhookSecret(): string | undefined {
  const mode = getEnv("RAZORPAY_MODE") || "test";
  const isLive = mode === "live";

  return isLive
    ? (getEnv("RAZORPAY_WEBHOOK_SECRET_LIVE") || getEnv("RAZORPAY_WEBHOOK_SECRET"))
    : (getEnv("RAZORPAY_WEBHOOK_SECRET_TEST") || getEnv("RAZORPAY_WEBHOOK_SECRET"));
}

// Environment variable getter (Node.js runtime)
function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (process.env as any)[name];
  }
  // Fallback for Edge runtime
  const fromDeno = (globalThis as any)?.Deno?.env?.get?.(name);
  return fromDeno;
}

// Verify webhook signature using crypto
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !payload || !secret) {
    return false;
  }

  try {
    // Import crypto module (Node.js built-in)
    const crypto = require('crypto');
    
    // Razorpay uses HMAC SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    // Razorpay sends signature in format: "signature1=hash1,signature2=hash2"
    // We need to check if our hash matches any of them
    const signatures = signature.split(',');
    for (const sig of signatures) {
      const parts = sig.split('=');
      if (parts.length === 2) {
        const hash = parts[1];
        if (hash === expectedSignature) {
          return true;
        }
      }
    }
    
    // Also check direct match (some webhook implementations send just the hash)
    if (signature === expectedSignature) {
      return true;
    }
    
    return false;
  } catch (err) {
    console.error("❌ Signature verification error:", err);
    return false;
  }
}

export default async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return j({}, 200);
  }

  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const signature = req.headers.get("x-razorpay-signature") || "";
    const payload = await req.text();

    console.log("📥 Razorpay webhook received:", {
      hasSignature: !!signature,
      payloadLength: payload.length,
    });

    // Verify webhook signature (if secret is configured)
    const webhookSecret = getRazorpayWebhookSecret();
    if (webhookSecret) {
      const isValid = verifyWebhookSignature(payload, signature, webhookSecret);
      if (!isValid) {
        console.error("❌ Invalid webhook signature");
        return j({ ok: false, error: "Invalid signature" }, 401);
      }
    } else {
      console.warn("⚠️ Webhook secret not configured - skipping signature verification (NOT RECOMMENDED for production)");
    }

    const data = JSON.parse(payload);
    const event = data.event;
    const payment = data.payload?.payment?.entity || data.payload?.payment;
    const order = data.payload?.order?.entity || data.payload?.order;

    console.log("📨 Webhook event:", event, {
      paymentId: payment?.id,
      orderId: payment?.order_id || order?.id,
      status: payment?.status,
    });

    // Handle payment success events - WEBHOOK IS PRIMARY METHOD
    // This ensures bookings are created even if customer doesn't return to browser
    const successEvents = ["payment.captured", "order.paid", "payment.authorized"];
    const isPaymentSuccess = successEvents.includes(event) && 
                            (payment?.status === "captured" || payment?.status === "authorized" || !payment?.status);

    if (isPaymentSuccess) {
      const paymentId = payment?.id;
      const orderId = payment?.order_id || order?.id;
      
      if (!paymentId || !orderId) {
        console.error("❌ Missing payment/order ID in webhook payload:", {
          paymentId,
          orderId,
          event,
        });
        // Still return 200 to prevent Razorpay retries
        return j({ ok: true, received: true, warning: "Missing payment/order ID" });
      }

      console.log("✅ Payment successful event received:", { paymentId, orderId, event });
      
      try {
        // Fetch order to get booking data from notes
        const razorpayOrder = await fetchRazorpayOrder(orderId);
        const bookingData = extractBookingData(razorpayOrder.notes);
        
        if (bookingData) {
          console.log("📦 Booking data found in order notes, creating booking via webhook (PRIMARY METHOD)...");
          const result = await createBookingFromWebhook(paymentId, orderId, bookingData);
          
          if (result.success) {
            console.log("✅ Booking created successfully via webhook:", {
              bookingId: result.bookingId,
              alreadyExists: result.alreadyExists,
              paymentId,
            });
          } else {
            console.error("❌ Booking creation failed in webhook:", result);
            // Log error but don't fail webhook - success page will try as fallback
          }
        } else {
          console.warn("⚠️ No booking data found in order notes for payment:", paymentId);
          console.warn("⚠️ Booking will be created on success page as fallback (if customer returns)");
        }
      } catch (err: any) {
        console.error("❌ Failed to create booking from webhook:", {
          error: err?.message || err,
          paymentId,
          orderId,
          stack: err?.stack,
        });
        // Don't fail the webhook - always return 200 to prevent Razorpay retries
        // Success page will create booking as fallback if customer returns
      }
    } else if (event === "payment.failed") {
      console.log("❌ Payment failed:", payment?.id);
      // Log failed payment for monitoring
    } else {
      console.log("ℹ️ Unhandled webhook event:", event);
    }

    // Always return 200 to Razorpay (even if booking creation failed)
    // This prevents Razorpay from retrying unnecessarily
    // The success page will handle booking creation as fallback
    return j({ ok: true, received: true });
  } catch (err: any) {
    console.error("💥 Webhook error:", {
      error: err?.message || err,
      stack: err?.stack,
    });
    // Still return 200 to prevent Razorpay from retrying
    // Logging the error is sufficient for monitoring
    return j({ ok: true, received: true, error: String(err?.message || err) });
  }
}
