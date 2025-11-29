import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BookingConfirmationDialog from "@/components/BookingConfirmationDialog";
import { CheckCircle2, Loader2, XCircle, Sparkles, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PendingBooking = {
  selectedStations: string[];
  selectedDateISO: string;
  slots: Array<{ start_time: string; end_time: string }>;
  duration: number;
  customer: { id?: string; name: string; phone: string; email?: string };
  pricing: { original: number; discount: number; final: number; coupons: string };
};

// Phone number normalization (removes all non-digit characters)
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Generate unique Customer ID
const generateCustomerID = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const phoneHash = normalized.slice(-4);
  return `CUE${phoneHash}${timestamp}`;
};

export default function PublicPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get("payment_id") || "";
  const orderId = searchParams.get("order_id") || "";
  const signature = searchParams.get("signature") || "";
  const [status, setStatus] = useState<"checking" | "creating" | "done" | "failed">("checking");
  const [msg, setMsg] = useState("Verifying your payment…");
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [bookingConfirmationData, setBookingConfirmationData] = useState<any>(null);
  const [showPaymentWarning, setShowPaymentWarning] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!paymentId || !orderId) {
        setStatus("failed");
        setMsg("Missing payment details. Please rebook.");
        return;
      }

      // 1) RECONCILE PAYMENT - Check Razorpay API and create booking if payment succeeded
      // This is the core solution: verify payment status directly from Razorpay API
      // Works even if customer doesn't return to browser (can be called from anywhere)
      try {
        console.log("🔍 Reconciling payment with Razorpay API...");
        const reconcileRes = await fetch("/api/razorpay/reconcile-payment", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            order_id: orderId,
            payment_id: paymentId,
          }),
        });

        const reconcileData = await reconcileRes.json();
        
        if (reconcileRes.ok && reconcileData?.success) {
          console.log("✅ Payment reconciled and booking created:", reconcileData.bookingId);
          // Clear pending booking from localStorage
          localStorage.removeItem("pendingBooking");
          
          // Booking is created, fetch details and show confirmation
          // Continue to fetch booking details below
        } else {
          console.warn("⚠️ Reconciliation failed or payment not successful:", reconcileData?.error);
          // Payment might not be successful yet, or already processed
          // Continue to check if booking exists
        }
      } catch (err) {
        console.error("❌ Error reconciling payment:", err);
        // Continue to check if booking exists
      }

      // 2) Verify payment with backend (for UI confirmation)
      try {
        const verifyRes = await fetch("/api/razorpay/verify-payment", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
          }),
        });

        const verifyData = await verifyRes.json();

        if (!verifyRes.ok || !verifyData?.ok || !verifyData?.success) {
          setStatus("failed");
          setMsg(verifyData?.error || "Payment verification failed.");
          return;
        }
      } catch (err) {
        console.error("Payment verification error:", err);
        setStatus("failed");
        setMsg("Could not verify payment at this time. Please try again.");
        return;
      }

      // 3) Check if booking exists (created by reconciliation or webhook)
      // Reconciliation API should have created it, but check anyway
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("id, station_id, customer_id, booking_date, start_time, end_time")
        .eq("payment_txn_id", paymentId)
        .maybeSingle();

      if (existingBooking) {
        // Booking already created by webhook (PRIMARY METHOD) - fetch full details
        console.log("✅ Booking already exists (created by webhook - PRIMARY METHOD):", existingBooking.id);
        
        // Get all bookings for this payment
        const { data: allBookings } = await supabase
          .from("bookings")
          .select("id, station_id, booking_date, start_time, end_time, final_price, coupon_code, discount_percentage")
          .eq("payment_txn_id", paymentId);

        if (allBookings && allBookings.length > 0) {
          // Fetch customer and station details
          const { data: customer } = await supabase
            .from("customers")
            .select("name")
            .eq("id", existingBooking.customer_id)
            .single();

          const stationIds = [...new Set(allBookings.map(b => b.station_id))];
          const { data: stationsData } = await supabase
            .from("stations")
            .select("id, name")
            .in("id", stationIds);

          const stationNames = stationsData?.map(s => s.name) || [];
          const totalAmount = allBookings.reduce((sum, b) => sum + (b.final_price || 0), 0);
          const firstBooking = allBookings[0];
          const lastBooking = allBookings[allBookings.length - 1];

          const confirmationData = {
            bookingId: existingBooking.id.substring(0, 8).toUpperCase(),
            customerName: customer?.name || "Customer",
            stationNames: stationNames,
            date: firstBooking.booking_date,
            startTime: new Date(`2000-01-01T${firstBooking.start_time}`).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
            endTime: new Date(`2000-01-01T${lastBooking.end_time}`).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
            totalAmount: totalAmount,
            couponCode: firstBooking.coupon_code || undefined,
            discountAmount: firstBooking.discount_percentage ? (totalAmount * firstBooking.discount_percentage / 100) : undefined,
            paymentMode: "razorpay",
            paymentTxnId: paymentId,
          };

          localStorage.removeItem("pendingBooking");
          
          setBookingConfirmationData(confirmationData);
          setStatus("done");
          setMsg("Booking confirmed successfully!");
          setShowPaymentWarning(false);
          
          setTimeout(() => {
            setShowConfirmationDialog(true);
          }, 500);
          return;
        }
      }

      // 3) Get pending booking from localStorage (FALLBACK - only if webhook didn't create it)
      // This is a safety net in case webhook failed or didn't fire
      // In normal flow, webhook should have already created the booking
      const raw = localStorage.getItem("pendingBooking");
      if (!raw) {
        setStatus("failed");
        setMsg("No booking data found. If payment was successful, your booking may have been created. Please contact support.");
        return;
      }

      const pb: PendingBooking = JSON.parse(raw);

      setStatus("creating");
      setMsg("Payment successful! Creating your booking (fallback method)…");
      setShowPaymentWarning(true);

      // 4) Ensure customer exists (by phone); create if needed
      let customerId = pb.customer.id;
      if (!customerId) {
        // Normalize phone number (same as venue booking flow)
        const normalizedPhone = normalizePhoneNumber(pb.customer.phone);
        
        // Check if exists by normalized phone
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id, name, custom_id")
          .eq("phone", normalizedPhone)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Generate customer ID (same as venue booking flow)
          const customerID = generateCustomerID(normalizedPhone);
          
          // Create new customer with normalized phone and custom_id
          const { data: created, error: cErr } = await supabase
            .from("customers")
            .insert({
              name: pb.customer.name,
              phone: normalizedPhone,
              email: pb.customer.email || null,
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
              setStatus("failed");
              setMsg("This phone number is already registered. Please contact support.");
              return;
            }
            setStatus("failed");
            setMsg("Could not create customer. Please contact support or rebook.");
            return;
          }
          customerId = created!.id;
        }
      }

      // 5) Create bookings (one per station per slot) - FALLBACK if webhook didn't create it
      // This should rarely happen if webhook is properly configured
      console.log("⚠️ Creating booking via success page (FALLBACK) - webhook should have created it");
      const rows: any[] = [];
      const totalBookings = pb.selectedStations.length * pb.slots.length;
      pb.selectedStations.forEach((station_id) => {
        pb.slots.forEach((slot) => {
          rows.push({
            station_id,
            customer_id: customerId!,
            booking_date: pb.selectedDateISO,
            start_time: slot.start_time,
            end_time: slot.end_time,
            duration: pb.duration,
            status: "confirmed",
            original_price: pb.pricing.original / totalBookings,
            discount_percentage: pb.pricing.discount > 0 ? (pb.pricing.discount / pb.pricing.original) * 100 : null,
            final_price: pb.pricing.final / totalBookings,
            coupon_code: pb.pricing.coupons || null,
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
        setStatus("failed");
        setMsg(`Payment ok, but booking creation failed: ${bErr.message}`);
        return;
      }

      // 6) Fetch station names for confirmation
      const stationIds = [...new Set(insertedBookings?.map(b => b.station_id) || [])];
      const { data: stationsData } = await supabase
        .from("stations")
        .select("id, name")
        .in("id", stationIds);

      const stationNames = stationsData?.map(s => s.name) || pb.selectedStations;

      // 7) Prepare confirmation data
      const firstSlot = pb.slots[0];
      const lastSlot = pb.slots[pb.slots.length - 1];
      
      const confirmationData = {
        bookingId: insertedBookings?.[0]?.id.substring(0, 8).toUpperCase() || "N/A",
        customerName: pb.customer.name,
        stationNames: stationNames,
        date: pb.selectedDateISO,
        startTime: new Date(`2000-01-01T${firstSlot.start_time}`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        endTime: new Date(`2000-01-01T${lastSlot.end_time}`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        totalAmount: pb.pricing.final,
        couponCode: pb.pricing.coupons || undefined,
        discountAmount: pb.pricing.discount > 0 ? pb.pricing.discount : undefined,
        paymentMode: "razorpay",
        paymentTxnId: paymentId,
      };

      localStorage.removeItem("pendingBooking");
      
      setBookingConfirmationData(confirmationData);
      setStatus("done");
      setMsg("Booking confirmed successfully!");
      setShowPaymentWarning(false);
      
      // Show confirmation dialog after a brief delay
      setTimeout(() => {
        setShowConfirmationDialog(true);
      }, 500);
    };

    run();
  }, [paymentId, orderId, signature]);

  const getStatusIcon = () => {
    switch (status) {
      case "checking":
      case "creating":
        return <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />;
      case "done":
        return <CheckCircle2 className="h-12 w-12 text-green-400" />;
      case "failed":
        return <XCircle className="h-12 w-12 text-red-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "checking":
      case "creating":
        return "from-blue-500 to-cyan-500";
      case "done":
        return "from-green-500 to-emerald-500";
      case "failed":
        return "from-red-500 to-rose-500";
    }
  };

  return (
    <>
      {/* Payment Warning Dialog - Non-dismissible */}
      <Dialog open={showPaymentWarning && (status === "checking" || status === "creating")} onOpenChange={() => {}}>
        <DialogContent className="bg-gradient-to-br from-red-950/95 to-orange-950/95 border-2 border-red-500/50 shadow-2xl max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/20 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-400 animate-pulse" />
              </div>
              <DialogTitle className="text-2xl font-bold text-red-100">
                ⚠️ IMPORTANT WARNING
              </DialogTitle>
            </div>
            <DialogDescription className="text-orange-100 text-base font-semibold leading-relaxed space-y-3 pt-2">
              <p className="text-lg font-bold text-white">
                DO NOT CLOSE OR REFRESH THIS PAGE!
              </p>
              <p className="text-orange-200">
                Your booking is being processed. Please wait until you see the booking confirmation page.
              </p>
              <p className="text-yellow-200 font-medium">
                Closing or refreshing now may result in payment failure or incomplete booking.
              </p>
              <div className="bg-black/30 rounded-lg p-3 mt-4 border border-yellow-500/30">
                <p className="text-sm text-yellow-100">
                  💡 <strong>Tip:</strong> Keep this page open until you see "Booking Confirmed" message.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] p-6 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-md w-full relative z-10">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl shadow-2xl p-8 text-center">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className={`relative p-4 rounded-full bg-gradient-to-br ${getStatusColor()} bg-opacity-20`}>
                {getStatusIcon()}
                {status === "done" && (
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <h1 className={`text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r ${getStatusColor()}`}>
              {status === "done" ? "Payment Successful!" : status === "failed" ? "Payment Issue" : "Processing Payment"}
            </h1>

            {/* Message */}
            <p className="text-gray-300 mb-6 text-lg">
              {msg}
            </p>

            {/* Status-specific content */}
            {status === "done" && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-green-400 font-medium">
                    ✓ Payment verified and booking confirmed
                  </p>
                </div>
                <button
                  onClick={() => navigate("/public/booking")}
                  className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-3 text-white font-semibold transition-all transform hover:scale-105 shadow-lg shadow-purple-500/50"
                >
                  Back to Booking
                </button>
              </div>
            )}

            {status === "failed" && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">
                    Please try again or contact support if the issue persists.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/public/booking")}
                  className="w-full rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 px-6 py-3 text-white font-semibold transition-all transform hover:scale-105"
                >
                  Try Again
                </button>
              </div>
            )}

            {status !== "done" && status !== "failed" && (
              <div className="mt-4">
                <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${getStatusColor()} animate-pulse`} style={{ width: "60%" }} />
                </div>
                <p className="text-xs text-gray-500 mt-2">Please wait while we process your payment...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Confirmation Dialog */}
      {bookingConfirmationData && (
        <BookingConfirmationDialog
          isOpen={showConfirmationDialog}
          onClose={() => {
            setShowConfirmationDialog(false);
            navigate("/public/booking");
          }}
          bookingData={bookingConfirmationData}
        />
      )}
    </>
  );
}
