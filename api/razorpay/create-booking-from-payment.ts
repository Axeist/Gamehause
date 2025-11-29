// API endpoint to verify payment and create booking immediately
// This is called when payment succeeds to ensure booking is created even if customer doesn't return
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
      "Access-Control-Allow-Headers": "content-type",
    },
  });
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

// Verify payment and create booking
async function verifyAndCreateBooking(paymentId: string, orderId: string) {
  const supabase = await createSupabaseClient();
  
  console.log("🔍 Verifying payment and creating booking:", { paymentId, orderId });
  
  // 1. Check if booking already exists (idempotency)
  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id")
    .eq("payment_txn_id", paymentId)
    .maybeSingle();
  
  if (existingBooking) {
    console.log("✅ Booking already exists:", existingBooking.id);
    return { success: true, bookingId: existingBooking.id, alreadyExists: true };
  }
  
  // 2. Verify payment status with Razorpay
  const payment = await fetchRazorpayPayment(paymentId);
  
  if (payment.status !== "captured" && payment.status !== "authorized") {
    throw new Error(`Payment not successful. Status: ${payment.status}`);
  }
  
  console.log("✅ Payment verified as successful:", payment.status);
  
  // 3. Fetch order to get booking data
  const razorpayOrder = await fetchRazorpayOrder(orderId);
  const bookingData = extractBookingData(razorpayOrder.notes);
  
  if (!bookingData) {
    throw new Error("No booking data found in order notes");
  }
  
  console.log("📦 Booking data extracted from order notes");
  
  // 4. Ensure customer exists
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
  
  // 5. Create bookings
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
  
  console.log("✅ Booking created successfully:", insertedBookings?.length, "records");
  
  return { success: true, bookingId: insertedBookings?.[0]?.id, alreadyExists: false };
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
    const payload = await req.json();
    const { payment_id, order_id } = payload;

    if (!payment_id || !order_id) {
      return j({ ok: false, error: "Missing payment_id or order_id" }, 400);
    }

    console.log("📞 Create booking from payment called:", { payment_id, order_id });

    const result = await verifyAndCreateBooking(payment_id, order_id);

    return j({
      ok: true,
      success: result.success,
      bookingId: result.bookingId,
      alreadyExists: result.alreadyExists,
    });
  } catch (err: any) {
    console.error("❌ Error creating booking from payment:", err);
    return j({
      ok: false,
      error: err?.message || String(err),
    }, 500);
  }
}

