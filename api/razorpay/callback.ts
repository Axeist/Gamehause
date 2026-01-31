// Using Node.js runtime to use Razorpay SDK and Supabase client
export const config = {
  maxDuration: 30, // 30 seconds
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Helper functions (similar to webhook.ts)
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

function extractBookingData(orderNotes: any): any | null {
  if (!orderNotes) return null;
  
  try {
    if (orderNotes.booking_data) {
      const base64Data = typeof orderNotes.booking_data === 'string' 
        ? orderNotes.booking_data 
        : Buffer.from(orderNotes.booking_data).toString('base64');
      const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    }
    
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

function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

function generateCustomerID(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const phoneHash = normalized.slice(-4);
  return `CUE${phoneHash}${timestamp}`;
}

// Create booking in callback (backup to webhook)
async function createBookingInCallback(paymentId: string, orderId: string) {
  try {
    const supabase = await createSupabaseClient();
    
    console.log("📦 Creating booking in callback:", { paymentId, orderId });
    
    // Check if booking already exists (idempotency - webhook might have created it)
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("payment_txn_id", paymentId)
      .maybeSingle();
    
    if (existingBooking) {
      console.log("✅ Booking already exists (created by webhook):", existingBooking.id);
      return { success: true, alreadyExists: true };
    }
    
    // Fetch order to get booking data
    const razorpayOrder = await fetchRazorpayOrder(orderId);
    const bookingData = extractBookingData(razorpayOrder.notes);
    
    if (!bookingData) {
      console.warn("⚠️ No booking data found in order notes");
      return { success: false, error: "No booking data found" };
    }
    
    // Create customer if needed
    const normalizedPhone = normalizePhoneNumber(bookingData.customer.phone);
    let customerId = bookingData.customer.id;
    
    if (!customerId) {
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
    
    // Create bookings
    const rows: any[] = [];
    // Validate booking slots for conflicts BEFORE creating
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
            .eq("payment_txn_id", paymentId)
            .in("status", ["confirmed", "in-progress"])
            .limit(1)
            .maybeSingle();

          if (existingBooking) {
            // Same payment, booking already exists
            console.log("✅ Booking already exists for this payment in callback");
            return { success: true, bookingId: existingBooking.id, alreadyExists: true };
          } else {
            // Real conflict
            console.error("❌ Booking conflict in callback: Another booking exists");
            return { success: false, error: "Booking conflict: Time slot is already booked" };
          }
        }
      }
    }

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
      // Check if error is due to booking conflict
      if (bErr.code === '23505' || bErr.message?.includes('Booking conflict')) {
        console.error("❌ Booking conflict detected by database trigger");
        return { success: false, error: "Booking conflict: Time slot is already booked" };
      }
      console.error("❌ Booking creation failed:", bErr);
      throw bErr;
    }
    
    console.log("✅ Booking created successfully in callback:", insertedBookings?.length, "records");
    return { success: true, bookingId: insertedBookings?.[0]?.id, alreadyExists: false };
  } catch (err: any) {
    console.error("❌ Failed to create booking in callback:", err);
    return { success: false, error: err.message };
  }
}

export default async function handler(req: Request) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Razorpay returns payment details in query params or POST body
    const razorpayPaymentId = url.searchParams.get("razorpay_payment_id");
    const razorpayOrderId = url.searchParams.get("razorpay_order_id");
    const razorpaySignature = url.searchParams.get("razorpay_signature");
    const paymentStatus = url.searchParams.get("payment_status") || url.searchParams.get("status");

    // Also check POST body if it's a POST request
    let postData: any = {};
    if (req.method === "POST") {
      try {
        postData = await req.json();
      } catch {
        // Not JSON, try form data
        try {
          const formData = await req.formData();
          postData = Object.fromEntries(formData.entries());
        } catch {
          // Ignore
        }
      }
    }

    const finalPaymentId = razorpayPaymentId || postData.razorpay_payment_id;
    const finalOrderId = razorpayOrderId || postData.razorpay_order_id;
    const finalSignature = razorpaySignature || postData.razorpay_signature;
    const finalStatus = paymentStatus || postData.payment_status || postData.status;

    console.log("🔄 Razorpay callback received:", {
      method: req.method,
      paymentId: finalPaymentId,
      orderId: finalOrderId,
      status: finalStatus,
      hasSignature: !!finalSignature,
    });

    // Redirect base URL (single canonical domain, serverless-safe)
    const base = (getEnv("PAYMENTS_REDIRECT_BASE_URL") || "https://gamehaus.co.in").replace(/\/$/, "");

    // Determine if payment was successful
    // Razorpay typically returns success when payment_id is present and status is not failed/cancelled
    const isSuccess = Boolean(finalPaymentId && finalOrderId && finalSignature) &&
      finalStatus !== "failed" &&
      finalStatus !== "cancelled" &&
      finalStatus !== "error";

    // CREATE BOOKING HERE if payment is successful (before redirect)
    // This is a backup to webhook - ensures booking is created even if webhook hasn't fired yet
    // IMPORTANT: We await this to ensure booking is created before redirect
    if (isSuccess && finalPaymentId && finalOrderId) {
      console.log("🔄 Creating booking in callback (backup to webhook)...");
      try {
        const result = await createBookingInCallback(finalPaymentId, finalOrderId);
        if (result.success) {
          console.log("✅ Booking created in callback:", result.bookingId);
        } else {
          console.warn("⚠️ Booking creation in callback failed:", result.error);
          // Continue anyway - success page will try as final fallback
        }
      } catch (err: any) {
        console.error("❌ Error creating booking in callback:", err);
        // Continue anyway - success page will try as final fallback
      }
    }

    // Extract error message if available
    const errorParam = url.searchParams.get("error") || postData.error ||
      (finalStatus === "failed" ? "Payment was declined" :
        finalStatus === "cancelled" ? "Payment was cancelled" :
          finalStatus === "error" ? "Payment error occurred" : "");

    const redirectUrl = isSuccess
      ? `${base}/public/payment/success?payment_id=${encodeURIComponent(finalPaymentId || '')}&order_id=${encodeURIComponent(finalOrderId || '')}&signature=${encodeURIComponent(finalSignature || '')}`
      : `${base}/public/payment/failed?order_id=${encodeURIComponent(finalOrderId || 'unknown')}${errorParam ? `&error=${encodeURIComponent(errorParam)}` : ''}`;

    console.log("🚀 Redirecting to:", redirectUrl, { isSuccess, paymentId: finalPaymentId });

    // Create redirect response with fallback
    const redirectHtml = `<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
    <meta http-equiv="refresh" content="0;url=${redirectUrl}">
    <script>
        // Immediate redirect
        window.location.href = "${redirectUrl}";
        
        // Fallback redirect after 1 second
        setTimeout(function() {
            window.location.href = "${redirectUrl}";
        }, 1000);
        
        // Final fallback after 3 seconds
        setTimeout(function() {
            window.location.href = "${redirectUrl}";
        }, 3000);
    </script>
</head><body>
    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h2>Processing payment...</h2>
        <p>If you are not automatically redirected, <a href="${redirectUrl}">click here</a></p>
        <p><small>Payment ID: ${finalPaymentId || 'Processing...'}</small></p>
    </div>
</body></html>`;

    return new Response(redirectHtml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error("❌ Razorpay callback error:", error);

    const fallbackBase = (getEnv("PAYMENTS_REDIRECT_BASE_URL") || "https://gamehaus.co.in").replace(/\/$/, "");
    const fallbackUrl = `${fallbackBase}/public/payment/failed`;
    const fallbackHtml = `<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Payment Error</title>
    <meta http-equiv="refresh" content="3;url=${fallbackUrl}">
    <script>
        setTimeout(function() {
            window.location.href = "${fallbackUrl}";
        }, 3000);
    </script>
</head><body>
    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h2>Payment Processing Error</h2>
        <p>There was an issue processing your payment. You will be redirected shortly.</p>
        <p>If you are not automatically redirected, <a href="${fallbackUrl}">click here</a></p>
    </div>
</body></html>`;

    return new Response(fallbackHtml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  }
}
