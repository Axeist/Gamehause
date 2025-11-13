// Using Edge runtime - works with direct HTTP calls (no SDK needed)
export const config = { runtime: "edge" };

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// Edge-safe env getter
function getEnv(name: string): string | undefined {
  const fromDeno = (globalThis as any)?.Deno?.env?.get?.(name);
  const fromProcess = typeof process !== "undefined" ? (process.env as any)?.[name] : undefined;
  return fromDeno ?? fromProcess;
}

// Base64 encoding for Edge runtime
function base64Encode(str: string): string {
  try {
    return btoa(str);
  } catch (e) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const binary = String.fromCharCode(...bytes);
    return btoa(binary);
  }
}

function need(name: string) {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getRazorpayCredentials() {
  const mode = getEnv("RAZORPAY_MODE") || "test";
  const isLive = mode === "live";

  const keyId = isLive
    ? (getEnv("RAZORPAY_KEY_ID_LIVE") || getEnv("RAZORPAY_KEY_ID") || need("RAZORPAY_KEY_ID_LIVE"))
    : (getEnv("RAZORPAY_KEY_ID_TEST") || getEnv("RAZORPAY_KEY_ID") || need("RAZORPAY_KEY_ID_TEST"));

  const keySecret = isLive
    ? (getEnv("RAZORPAY_KEY_SECRET_LIVE") || getEnv("RAZORPAY_KEY_SECRET") || need("RAZORPAY_KEY_SECRET_LIVE"))
    : (getEnv("RAZORPAY_KEY_SECRET_TEST") || getEnv("RAZORPAY_KEY_SECRET") || need("RAZORPAY_KEY_SECRET_TEST"));

  return { keyId, keySecret, mode };
}

async function fetchPaymentStatus(paymentId: string, signal?: AbortSignal) {
  const { keyId, keySecret } = getRazorpayCredentials();

  // Use direct HTTP call instead of SDK to avoid connection keep-alive issues
  // Edge runtime doesn't have Buffer, use base64 encoding function
  const credentials = `${keyId}:${keySecret}`;
  const auth = base64Encode(credentials);
  
  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Connection': 'close', // Explicitly close connection
    },
    signal: signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Razorpay API error: ${response.status} - ${errorText}`);
  }

  const payment = await response.json();
  return payment;
}

export default async function handler(req: Request) {
  const startTime = Date.now();
  
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    // In Edge runtime, parse body from request
    const payload = await req.json().catch(() => ({}));
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = payload;

    console.log("🔍 Verifying Razorpay payment:", { razorpay_payment_id, razorpay_order_id });

    if (!razorpay_payment_id) {
      return j({ ok: false, error: "Payment ID is required" }, 400);
    }

    // Add timeout wrapper for Razorpay API call (8 seconds max to avoid Vercel timeout)
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 8000);

    let payment: any;
    try {
      payment = await fetchPaymentStatus(razorpay_payment_id, abortController.signal);
      clearTimeout(timeoutId);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (abortController.signal.aborted || err?.message?.includes("aborted")) {
        throw new Error("Request timeout: Razorpay API took too long");
      }
      throw err;
    }

    // Check if payment is successful
    const isSuccess = payment.status === "captured" || payment.status === "authorized";

    if (!isSuccess) {
      return j({
        ok: false,
        success: false,
        status: payment.status,
        error: payment.error_description || `Payment status: ${payment.status}`,
      });
    }

    console.log("✅ Payment verified successfully:", payment.id);

    return j({
      ok: true,
      success: true,
      paymentId: payment.id,
      orderId: payment.order_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
    });
  } catch (err: any) {
    console.error("💥 Verify payment error:", err);
    return j({ ok: false, error: String(err?.message || err) }, 500);
  }
}

