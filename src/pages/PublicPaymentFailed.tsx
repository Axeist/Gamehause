// src/pages/PublicPaymentFailed.tsx
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function PublicPaymentFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const error = searchParams.get("error") || "Payment failed";
  const orderId = searchParams.get("order_id") || "";

  useEffect(() => {
    // Clean up pending booking on failure
    localStorage.removeItem("pendingBooking");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-gray-200 p-6">
      <div className="max-w-md w-full rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <h1 className="text-xl font-bold mb-2 text-red-400">Payment Failed</h1>
        <p className="text-sm mb-2 text-gray-300">
          Your payment didn't go through. No booking was created.
        </p>
        {error && error !== "Payment failed" && (
          <p className="text-xs mb-4 text-gray-400 italic">
            Error: {decodeURIComponent(error)}
          </p>
        )}
        {orderId && (
          <p className="text-xs mb-4 text-gray-500">
            Order ID: {orderId.substring(0, 20)}...
          </p>
        )}
        <p className="text-sm mb-6 text-gray-400">
          Please try again or choose "Pay at Venue" option.
        </p>
        <button
          onClick={() => navigate("/public/booking")}
          className="inline-flex rounded-md bg-cuephoria-purple/80 hover:bg-cuephoria-purple px-4 py-2 text-white"
        >
          Rebook
        </button>
      </div>
    </div>
  );
}
