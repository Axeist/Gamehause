export const config = { runtime: "edge" };

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    
    // Extract payment details from query params
    const razorpayPaymentId = url.searchParams.get("razorpay_payment_id");
    const razorpayOrderId = url.searchParams.get("razorpay_order_id");
    const razorpaySignature = url.searchParams.get("razorpay_signature");

    // Also check POST body if available
    let postData: any = {};
    if (req.method === "POST") {
      try {
        postData = await req.json().catch(() => ({}));
      } catch {}
    }

    const paymentId = razorpayPaymentId || postData.razorpay_payment_id;
    const orderId = razorpayOrderId || postData.razorpay_order_id;
    const signature = razorpaySignature || postData.razorpay_signature;

    console.log("🔄 Razorpay callback:", { paymentId, orderId, method: req.method });

    // Get base URL from environment or use default
    const baseUrl = typeof process !== "undefined" 
      ? (process.env as any)?.NEXT_PUBLIC_SITE_URL || (process.env as any)?.VITE_SITE_URL || "https://admin.cuephoria.in"
      : "https://admin.cuephoria.in";

    if (paymentId && orderId) {
      // Redirect to success page
      return Response.redirect(
        `${baseUrl}/public/payment/success?payment_id=${encodeURIComponent(paymentId)}&order_id=${encodeURIComponent(orderId)}&signature=${encodeURIComponent(signature || "")}`,
        302
      );
    }

    // If no payment details, redirect to failure
    return Response.redirect(
      `${baseUrl}/public/payment/failed?error=${encodeURIComponent("Payment details missing")}`,
      302
    );
  } catch (err: any) {
    console.error("💥 Callback error:", err);
    const baseUrl = typeof process !== "undefined" 
      ? (process.env as any)?.NEXT_PUBLIC_SITE_URL || (process.env as any)?.VITE_SITE_URL || "https://admin.cuephoria.in"
      : "https://admin.cuephoria.in";
    
    return Response.redirect(
      `${baseUrl}/public/payment/failed?error=${encodeURIComponent(String(err?.message || err))}`,
      302
    );
  }
}

