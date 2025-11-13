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

function need(name: string) {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getRazorpayWebhookSecret() {
  const mode = getEnv("RAZORPAY_MODE") || "test";
  const isLive = mode === "live";

  return isLive
    ? (getEnv("RAZORPAY_WEBHOOK_SECRET_LIVE") || getEnv("RAZORPAY_WEBHOOK_SECRET") || "")
    : (getEnv("RAZORPAY_WEBHOOK_SECRET_TEST") || getEnv("RAZORPAY_WEBHOOK_SECRET") || "");
}

// Simplified HMAC verification for edge runtime
async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  if (!secret || !signature) return false;
  
  // For edge runtime, we'll use Web Crypto API
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Compare signatures (simplified - in production, use constant-time comparison)
    return computedSignature.toLowerCase() === signature.toLowerCase();
  } catch (err) {
    console.error("Webhook signature verification error:", err);
    return false;
  }
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const webhookSecret = getRazorpayWebhookSecret();

    console.log("📥 Razorpay webhook received:", {
      signature: signature.substring(0, 20) + "...",
      bodyLength: body.length,
    });

    // Verify signature if secret is provided
    if (webhookSecret) {
      const isValid = await verifyWebhookSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error("❌ Invalid webhook signature");
        return j({ ok: false, error: "Invalid signature" }, 401);
      }
    }

    const data = JSON.parse(body);
    console.log("📊 Webhook event:", data.event);

    // Handle different events
    switch (data.event) {
      case "payment.captured":
        console.log("✅ Payment captured:", data.payload.payment.entity.id);
        // TODO: Update booking status, send confirmation, etc.
        break;
      case "payment.failed":
        console.log("❌ Payment failed:", data.payload.payment.entity.id);
        // TODO: Handle failed payment
        break;
      case "order.paid":
        console.log("✅ Order paid:", data.payload.order.entity.id);
        // TODO: Handle order paid
        break;
      default:
        console.log("ℹ️ Unhandled event:", data.event);
    }

    return j({ ok: true, message: "Webhook processed" });
  } catch (err: any) {
    console.error("💥 Webhook error:", err);
    return j({ ok: false, error: String(err?.message || err) }, 500);
  }
}

