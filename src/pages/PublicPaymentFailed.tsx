// src/pages/PublicPaymentFailed.tsx
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { XCircle, AlertTriangle, ArrowLeft, RefreshCw, CreditCard } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl shadow-2xl p-8 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative p-4 rounded-full bg-gradient-to-br from-red-500/20 to-rose-500/20">
              <XCircle className="h-12 w-12 text-red-400" />
              <div className="absolute -top-1 -right-1">
                <AlertTriangle className="h-6 w-6 text-orange-400 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-rose-500">
            Payment Failed
          </h1>

          {/* Main Message */}
          <p className="text-gray-300 mb-4 text-lg">
            Your payment didn't go through. No booking was created.
          </p>

          {/* Error Details */}
          {error && error !== "Payment failed" && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
              <p className="text-sm text-red-400 font-medium mb-1">Error Details:</p>
              <p className="text-xs text-gray-400 italic break-words">
                {decodeURIComponent(error)}
              </p>
            </div>
          )}

          {/* Order ID */}
          {orderId && (
            <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 mb-4">
              <p className="text-xs text-gray-400 mb-1">Order Reference</p>
              <p className="text-xs font-mono text-gray-300 break-all">
                {orderId.length > 30 ? `${orderId.substring(0, 30)}...` : orderId}
              </p>
            </div>
          )}

          {/* Helpful Message */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-6">
            <div className="flex items-start gap-2">
              <CreditCard className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm text-blue-400 font-medium mb-1">What you can do:</p>
                <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                  <li>Try the payment again</li>
                  <li>Choose "Pay at Venue" option</li>
                  <li>Contact support if issue persists</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate("/public/booking")}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-3 text-white font-semibold transition-all transform hover:scale-105 shadow-lg shadow-purple-500/50 flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <button
              onClick={() => navigate("/public/booking")}
              className="w-full rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 px-6 py-3 text-gray-300 font-medium transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Booking
            </button>
          </div>

          {/* Support Info */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              Need help? Contact us at{' '}
              <a href="tel:+919345187098" className="text-blue-400 hover:text-blue-300 underline">
                +91 93451 87098
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
