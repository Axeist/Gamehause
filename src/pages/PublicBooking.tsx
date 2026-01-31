import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StationSelector } from "@/components/booking/StationSelector";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import CouponPromotionalPopup from "@/components/CouponPromotionalPopup";
import BookingConfirmationDialog from "@/components/BookingConfirmationDialog";
import LegalDialog from "@/components/dialog/LegalDialog";
import { useSubscription } from "@/context/SubscriptionContext";
import PublicBookingUnavailableDialog from "@/components/PublicBookingUnavailableDialog";
import {
  CalendarIcon,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Gamepad2,
  Timer,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Lock,
  X,
  CreditCard,
  Table2,
} from "lucide-react";
import { BASE_URL, BRAND_NAME, LOGO_PATH, SUPPORT_EMAIL } from "@/config/brand";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format, parse, getDay } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

/* =========================
   Types
   ========================= */
type StationType = "ps5" | "8ball" | "foosball";
interface Station {
  id: string;
  name: string;
  type: StationType;
  hourly_rate: number;
}
interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
  status?: 'available' | 'booked' | 'elapsed';
}
interface CustomerInfo {
  id?: string;
  name: string;
  phone: string;
  email: string;
}
interface TodayBookingRow {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show";
  station_id: string;
  customer_id: string;
  stationName: string;
  customerName: string;
  customerPhone: string;
}

/* =========================
   Helpers
   ========================= */
const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);

const genTxnId = () =>
  `CUE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const isHappyHour = (date: Date, slot: TimeSlot | null) => {
  if (!slot) return false;
  const day = getDay(date);
  const startHour = Number(slot.start_time.split(":")[0]);
  return day >= 1 && day <= 5 && startHour >= 11 && startHour < 16;
};

// ✅ NEW: Phone number normalization
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// ✅ NEW: Generate unique Customer ID
const generateCustomerID = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const phoneHash = normalized.slice(-4);
  return `CUE${phoneHash}${timestamp}`;
};

// ✅ NEW: Validate Indian phone number
const validatePhoneNumber = (phone: string): { valid: boolean; error?: string } => {
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.length !== 10) {
    return { valid: false, error: 'Phone number must be exactly 10 digits' };
  }

  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(normalized)) {
    return { valid: false, error: 'Please enter a valid Indian mobile number (starting with 6, 7, 8, or 9)' };
  }

  return { valid: true };
};

const getSlotDuration = (stationType: StationType) => {
  return 30; // All slots are now 30 minutes
};

const getBookingDuration = (stationIds: string[], stations: Station[]) => {
  return 30; // All bookings are now 30 minutes per slot
};

/* =========================
   Component
   ========================= */
export default function PublicBooking() {
  const isMobile = useIsMobile();
  const { hasBookingAccess, isLoading: subscriptionLoading } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationType, setStationType] = useState<"all" | StationType>("all");
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedSlotRange, setSelectedSlotRange] = useState<TimeSlot[]>([]);

  useEffect(() => {
    if (!subscriptionLoading && !hasBookingAccess) {
      setShowUpgradeDialog(true);
    }
  }, [hasBookingAccess, subscriptionLoading]);

  const [customerNumber, setCustomerNumber] = useState("");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
  });
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [appliedCoupons, setAppliedCoupons] = useState<Record<string, string>>({});
  const [couponCode, setCouponCode] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"venue" | "razorpay">("razorpay");
  const [loading, setLoading] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [payAtVenueEnabled, setPayAtVenueEnabled] = useState(false);
  const [pinInput, setPinInput] = useState("");

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [bookingConfirmationData, setBookingConfirmationData] = useState<any>(null);
  const [showLegalDialog, setShowLegalDialog] = useState(false);
  const [showPaymentWarning, setShowPaymentWarning] = useState(false);
  const [legalDialogType, setLegalDialogType] = useState<
    "terms" | "privacy" | "contact"
  >("terms");
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [todayRows, setTodayRows] = useState<TodayBookingRow[]>([]);
  const [todayLoading, setTodayLoading] = useState(false);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const prefillAppliedRef = useRef(false);
  const prefillTypeRef = useRef<"all" | StationType>("all");
  const prefillDateRef = useRef<string | null>(null);
  const prefillTimeRef = useRef<string | null>(null);
  const prefillStationIdsRef = useRef<string[] | null>(null);
  const prefillSpanRef = useRef<number | null>(null);
  const prefillNameRef = useRef<string | null>(null);
  const bookingSummaryRef = useRef<HTMLDivElement | null>(null);
  const didAutoScrollRef = useRef(false);

  // Load Razorpay script on mount (since razorpay is the default payment method)
  useEffect(() => {
    if (!(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => console.log("✅ Razorpay script loaded");
      script.onerror = () => {
        console.error("❌ Failed to load Razorpay script");
        toast.error("Failed to load payment gateway. Please refresh the page.");
      };
      document.body.appendChild(script);
    }
  }, []); // Load once on mount

  // Prefill from query params (used by Gameboy chatbot)
  useEffect(() => {
    if (prefillAppliedRef.current) return;

    const phone = searchParams.get("phone");
    const name = searchParams.get("name");
    const type = searchParams.get("type") as StationType | null;
    const stationsParam = searchParams.get("stations");
    const date = searchParams.get("date"); // yyyy-mm-dd
    const time = searchParams.get("time"); // HH:mm or HH:mm:ss
    const spanParam = searchParams.get("span"); // number of 30-min slots

    if (phone) {
      setCustomerNumber(phone);
    }
    if (name && name.trim()) {
      prefillNameRef.current = name.trim();
      setCustomerInfo((prev) => ({ ...prev, name: prev.name || name.trim() }));
    }

    if (stationsParam) {
      const ids = stationsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length) {
        prefillStationIdsRef.current = ids;
        setStationType("all");
      }
    } else if (type === "ps5" || type === "8ball" || type === "foosball") {
      prefillTypeRef.current = type;
      setStationType(type);
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      prefillDateRef.current = date;
      // Parse as local date
      const parsed = parse(date, "yyyy-MM-dd", new Date());
      setSelectedDate(parsed);
    }

    if (time) {
      prefillTimeRef.current = time.length === 5 ? `${time}:00` : time; // normalize to HH:mm:ss
    }
    if (spanParam) {
      const n = Number.parseInt(spanParam, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 12) prefillSpanRef.current = n;
    }

    prefillAppliedRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    fetchStations();
    fetchTodaysBookings();
  }, []);

  // After stations load, preselect stations matching the prefilled type (to power slot availability)
  useEffect(() => {
    const explicitIds = prefillStationIdsRef.current;
    const t = prefillTypeRef.current;
    if (!stations.length) return;
    // Only apply if user hasn't already selected stations
    if (selectedStations.length > 0) return;

    if (explicitIds && explicitIds.length) {
      const valid = explicitIds.filter((id) => stations.some((s) => s.id === id));
      if (valid.length) {
        setSelectedStations(valid);
        prefillStationIdsRef.current = null;
      }
      return;
    }

    if (t === "all") return;
    const ids = stations.filter((s) => s.type === t).map((s) => s.id);
    if (ids.length) setSelectedStations(ids);
  }, [stations, selectedStations.length]);

  // After slots load, auto-select the prefilled time if it exists and is available
  useEffect(() => {
    const t = prefillTimeRef.current;
    if (!t) return;
    if (!availableSlots.length) return;
    if (selectedSlot) return;

    const matchIndex = availableSlots.findIndex((s) => s.start_time === t && s.is_available);
    if (matchIndex >= 0) {
      const match = availableSlots[matchIndex]!;
      const span = prefillSpanRef.current ?? 1;
      if (span > 1) {
        const range = availableSlots.slice(matchIndex, matchIndex + span);
        const allOk = range.length === span && range.every((s) => s.is_available);
        if (allOk) {
          void handleSlotSelect(match, range);
        } else {
          void handleSlotSelect(match);
        }
      } else {
        void handleSlotSelect(match);
      }
      // consume the prefill time so user changes don't get overridden
      prefillTimeRef.current = null;
      prefillSpanRef.current = null;
    }
  }, [availableSlots, selectedSlot]);

  // If coming from chatbot on mobile, scroll to Booking Summary once slot is selected
  useEffect(() => {
    if (!isMobile) return;
    if (!prefillAppliedRef.current) return;
    if (didAutoScrollRef.current) return;
    if (!selectedSlot) return;
    didAutoScrollRef.current = true;
    window.setTimeout(() => {
      bookingSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  }, [isMobile, selectedSlot]);

  useEffect(() => {
    if (appliedCoupons["8ball"] === "HH99" && !isHappyHour(selectedDate, selectedSlot)) {
      setAppliedCoupons((prev) => {
        const copy = { ...prev };
        delete copy["8ball"];
        toast.error("❌ HH99 removed: valid only Mon–Fri 11 AM–4 PM");
        return copy;
      });
    }
    if (appliedCoupons["ps5"] === "HH99" && !isHappyHour(selectedDate, selectedSlot)) {
      setAppliedCoupons((prev) => {
        const copy = { ...prev };
        delete copy["ps5"];
        toast.error("❌ HH99 removed: valid only Mon–Fri 11 AM–4 PM");
        return copy;
      });
    }
  }, [selectedDate, selectedSlot, appliedCoupons]);

  useEffect(() => {
    const ch = supabase
      .channel("booking-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          if (selectedStations.length > 0 && selectedDate) fetchAvailableSlots();
          fetchTodaysBookings();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [selectedStations, selectedDate]);

  useEffect(() => {
    if (selectedStations.length > 0 && selectedDate) fetchAvailableSlots();
    else {
      setAvailableSlots([]);
      setSelectedSlot(null);
      setSelectedSlotRange([]);
    }
  }, [selectedStations, selectedDate]);

  // Auto-search customer when phone number reaches 10 digits
  useEffect(() => {
    const normalized = normalizePhoneNumber(customerNumber);
    if (normalized.length === 10 && !hasSearched && !searchingCustomer) {
      const timer = setTimeout(async () => {
        if (!customerNumber.trim()) {
          return;
        }

        const normalizedPhone = normalizePhoneNumber(customerNumber);
        
        const validation = validatePhoneNumber(normalizedPhone);
        if (!validation.valid) {
          return;
        }

        setSearchingCustomer(true);
        try {
          const { data, error } = await supabase
            .from("customers")
            .select("id, name, phone, email, custom_id")
            .eq("phone", normalizedPhone)
            .maybeSingle();
            
          if (error && (error as any).code !== "PGRST116") throw error;

          if (data) {
            setIsReturningCustomer(true);
            setCustomerInfo({
              id: data.id,
              name: data.name,
              phone: normalizedPhone,
              email: data.email || "",
            });
            toast.success(`Welcome back, ${data.name}! 🎮`);
          } else {
            setIsReturningCustomer(false);
            setCustomerInfo((prev) => ({
              name: prev.name || prefillNameRef.current || "",
              phone: normalizedPhone,
              email: prev.email || "",
            }));
            toast.info("New customer! Please fill in your details below.");
          }
          setHasSearched(true);
        } catch (e) {
          console.error(e);
          // Silently fail for auto-search
        } finally {
          setSearchingCustomer(false);
        }
      }, 500); // Small delay to avoid immediate search on typing
      return () => clearTimeout(timer);
    }
  }, [customerNumber, hasSearched, searchingCustomer]);

  async function fetchStations() {
    try {
      const { data, error } = await supabase
        .from("stations")
        .select("id, name, type, hourly_rate")
        .order("name");
      if (error) throw error;
      // Sort stations: 8ball (Tables) first, then PS5, then Foosball
      const sortedStations = (data || []).sort((a, b) => {
        const typeOrder: Record<string, number> = { '8ball': 0, 'ps5': 1, 'foosball': 2 };
        const aOrder = typeOrder[a.type] ?? 99;
        const bOrder = typeOrder[b.type] ?? 99;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        // If same type, sort by name
        return a.name.localeCompare(b.name);
      });
      setStations(sortedStations.map(station => ({
        ...station,
        type: station.type === "ps5" || station.type === "8ball" || station.type === "foosball" ? station.type : "ps5"
      })));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load stations");
    }
  }

  async function fetchAvailableSlots() {
    if (selectedStations.length === 0) return;
    setSlotsLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
      
      const slotDuration = 30; // All slots are 30 minutes
      
      if (selectedStations.length === 1) {
        const { data, error } = await supabase.rpc("get_available_slots", {
          p_date: dateStr,
          p_station_id: selectedStations[0],
          p_slot_duration: slotDuration,
        });
        if (error) {
          console.error("Error fetching slots:", error);
          throw error;
        }
        
        let slotsToSet = data || [];
        
        if (isToday) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          
          slotsToSet = slotsToSet.map((slot: TimeSlot) => {
            const [slotHour, slotMinute] = slot.start_time.split(':').map(Number);
            
            const isPast = (slotHour < currentHour) || 
                          (slotHour === currentHour && slotMinute <= currentMinute);
            
            if (isPast) {
              return {
                ...slot,
                is_available: false,
                status: 'elapsed' as const
              };
            }
            return slot;
          });
        }
        
        setAvailableSlots(slotsToSet);
      } else {
        const results = await Promise.all(
          selectedStations.map((id) =>
            supabase.rpc("get_available_slots", {
              p_date: dateStr,
              p_station_id: id,
              p_slot_duration: slotDuration,
            })
          )
        );
        const base = results.find((r) => !r.error && Array.isArray(r.data))
          ?.data as TimeSlot[] | undefined;
        if (!base) {
          const firstErr = results.find((r) => r.error)?.error;
          if (firstErr) throw firstErr;
          setAvailableSlots([]);
          return;
        }
        const key = (s: TimeSlot) => `${s.start_time}-${s.end_time}`;
        const union = new Map<string, boolean>();
        base.forEach((s) => union.set(key(s), Boolean(s.is_available)));
        results.forEach((r) => {
          (r.data || []).forEach((s: TimeSlot) => {
            const k = key(s);
            union.set(k, union.get(k) || Boolean(s.is_available));
          });
        });
        let merged = base.map((s) => ({
          ...s,
          is_available: union.get(key(s)) ?? false,
        }));
        
        if (isToday) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          
          merged = merged.map((slot) => {
            const [slotHour, slotMinute] = slot.start_time.split(':').map(Number);
            
            const isPast = (slotHour < currentHour) || 
                          (slotHour === currentHour && slotMinute <= currentMinute);
            
            if (isPast) {
              return {
                ...slot,
                is_available: false,
                status: 'elapsed' as const
              };
            }
            return slot;
          });
        }
        
        setAvailableSlots(merged);
      }

      if (
        selectedSlot &&
        !availableSlots.some(
          (s) =>
            s.start_time === selectedSlot.start_time &&
            s.end_time === selectedSlot.end_time &&
            s.is_available
        )
      ) {
        setSelectedSlot(null);
      }
    } catch (e: any) {
      console.error("Error in fetchAvailableSlots:", e);
      const errorMessage = e?.message || e?.error?.message || "Failed to load time slots";
      toast.error(`Failed to load time slots: ${errorMessage}`);
    } finally {
      setSlotsLoading(false);
    }
  }

  // ✅ UPDATED: searchCustomer with phone normalization
  async function searchCustomer() {
    if (!customerNumber.trim()) {
      toast.error("Please enter a customer number");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(customerNumber);
    
    const validation = validatePhoneNumber(normalizedPhone);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid phone number");
      return;
    }

    setSearchingCustomer(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, email, custom_id")
        .eq("phone", normalizedPhone)
        .maybeSingle();
        
      if (error && (error as any).code !== "PGRST116") throw error;

      if (data) {
        setIsReturningCustomer(true);
        setCustomerInfo({
          id: data.id,
          name: data.name,
          phone: normalizedPhone,
          email: data.email || "",
        });
        toast.success(`Welcome back, ${data.name}! 🎮`);
      } else {
        setIsReturningCustomer(false);
        setCustomerInfo((prev) => ({
          name: prev.name || prefillNameRef.current || "",
          phone: normalizedPhone,
          email: prev.email || "",
        }));
        toast.info("New customer! Please fill in your details below.");
      }
      setHasSearched(true);
    } catch (e) {
      console.error(e);
      toast.error("Failed to search customer");
    } finally {
      setSearchingCustomer(false);
    }
  }

  const handleStationToggle = (id: string) => {
    const station = stations.find(s => s.id === id);
    if (!station) return;
    
    setSelectedStations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSelectedSlot(null);
    setSelectedSlotRange([]);
  };

  async function filterStationsForSlot(slot: TimeSlot) {
    if (selectedStations.length === 0) return selectedStations;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    const slotDuration = 30; // All slots are 30 minutes
    
    const checks = await Promise.all(
      selectedStations.map(async (stationId) => {
        const { data, error } = await supabase.rpc("get_available_slots", {
          p_date: dateStr,
          p_station_id: stationId,
          p_slot_duration: slotDuration,
        });
        if (error) return { stationId, available: false };
        const match = (data || []).find(
          (s: any) =>
            s.start_time === slot.start_time &&
            s.end_time === slot.end_time &&
            s.is_available
        );
        return { stationId, available: Boolean(match) };
      })
    );
    const availableIds = checks.filter((c) => c.available).map((c) => c.stationId);
    const removed = checks.filter((c) => !c.available).map((c) => c.stationId);
    if (removed.length) {
      const names = stations
        .filter((s) => removed.includes(s.id))
        .map((s) => s.name)
        .join(", ");
      toast.message("Some stations aren't free at this time", {
        description: `Removed: ${names}.`,
      });
    }
    return availableIds;
  }

  async function handleSlotSelect(slot: TimeSlot | null, range?: TimeSlot[]) {
    // Handle deselection
    if (!slot) {
      setSelectedSlot(null);
      setSelectedSlotRange([]);
      return;
    }

    if (slot.status === 'elapsed') {
      toast.error("Cannot select a time slot that has already passed.");
      return;
    }
    
    if (selectedStations.length > 0) {
      // Check availability for all slots in range
      const slotsToCheck = range && range.length > 1 ? range : [slot];
      let allAvailable = true;
      
      for (const checkSlot of slotsToCheck) {
        const filtered = await filterStationsForSlot(checkSlot);
        if (filtered.length === 0) {
          allAvailable = false;
          break;
        }
      }
      
      if (!allAvailable) {
        toast.error("Some time slots aren't available for the selected stations.");
        setSelectedSlot(null);
        setSelectedSlotRange([]);
        return;
      }
    }
    
    setSelectedSlot(slot);
    setSelectedSlotRange(range || [slot]);
  }

  const allowedCoupons = [
    "TES1342",
    "GAMEHAUS25",
    "GAMEHAUS50",
    "HH99",
    "NIT50",
    "ALMA50",
    "AXEIST",
  ];

  function validateStudentID() {
    return window.confirm(
      "🎓 GAMEHAUS50 is for other college & school students ONLY.\nShow a valid student ID card during your visit for this discount. Apply?"
    );
  }

  function removeCoupon(key: string) {
    setAppliedCoupons((prev) => {
      const c = { ...prev };
      delete c[key];
      return c;
    });
  }

  function applyCoupon(raw: string) {
    const code = (raw || "").toUpperCase().trim();
    if (!allowedCoupons.includes(code)) {
      toast.error("🚫 Invalid coupon code. Please re-check and try again!");
      return;
    }

    const selectedHas8Ball = selectedStations.some(
      (id) => stations.find((s) => s.id === id && s.type === "8ball")
    );
    const selectedHasPS5 = selectedStations.some(
      (id) => stations.find((s) => s.id === id && s.type === "ps5")
    );
    const selectedHasFoosball = selectedStations.some(
      (id) => stations.find((s) => s.id === id && s.type === "foosball")
    );
    const happyHourActive = isHappyHour(selectedDate, selectedSlot);

    if (code === "TES1342") {
      setAppliedCoupons({ all: "TES1342" });
      toast.success("🧪 TES1342 applied: Test coupon - Price set to ₹1 for payment testing!");
      return;
    }

    if (code === "GAMEHAUS50") {
      if (!validateStudentID()) return;
      setAppliedCoupons({ all: "GAMEHAUS50" });
      toast.success(
        "📚 GAMEHAUS50 applied: 50% OFF for students with valid ID!\nShow your student ID when you visit! 🤝"
      );
      return;
    }

    if (code === "AXEIST") {
      const ok = window.confirm(
        "🥷 AXEIST grants 100% OFF for close friends. Apply?"
      );
      if (!ok) return;
      setAppliedCoupons({ all: "AXEIST" });
      toast.success("🥷 AXEIST applied! 100% OFF — Loyalty matters.");
      return;
    }

    if (code === "GAMEHAUS25") {
      setAppliedCoupons({ all: "GAMEHAUS25" });
      toast.success("🎉 GAMEHAUS25 applied: 25% OFF! Book more, play more! 🕹️");
      return;
    }

    if (code === "HH99") {
      if (!(selectedHas8Ball || selectedHasPS5 || selectedHasFoosball)) {
        toast.error("⏰ HH99 applies to PS5, Tables, and Foosball during Happy Hours.");
        return;
      }
      if (!happyHourActive) {
        toast.error("🕒 HH99 valid only Mon–Fri 11 AM to 4 PM (Happy Hours).");
        return;
      }
      setAppliedCoupons((prev) => {
        let updated = { ...prev };
        if (selectedHas8Ball) updated["8ball"] = "HH99";
        if (selectedHasPS5) updated["ps5"] = "HH99";
        if (selectedHasFoosball) updated["foosball"] = "HH99";
        return updated;
      });
      toast.success(
        "⏰ HH99 applied! PS5, Tables & Foosball at ₹99/hour during Happy Hours! ✨"
      );
      return;
    }

    if (code === "NIT50") {
      if (!(selectedHas8Ball || selectedHasPS5 || selectedHasFoosball)) {
        toast.error(
          "NIT50 can be applied to PS5, Tables, or Foosball stations in your selection."
        );
        return;
      }
      setAppliedCoupons((prev) => {
        let updated = { ...prev };
        if (selectedHasPS5) updated["ps5"] = "NIT50";
        if (selectedHas8Ball) updated["8ball"] = prev["8ball"] === "HH99" ? "HH99" : "NIT50";
        if (selectedHasFoosball) updated["foosball"] = "NIT50";
        return updated;
      });
      let msg = "🎓 NIT50 applied! 50% OFF for ";
      const types = [];
      if (selectedHasPS5) types.push("PS5");
      if (selectedHas8Ball) types.push("8-Ball");
      if (selectedHasFoosball) types.push("Foosball");
      msg += types.join(" & ") + " stations!";
      toast.success(msg);
      return;
    }

    if (code === "ALMA50") {
      if (!(selectedHas8Ball || selectedHasPS5 || selectedHasFoosball)) {
        toast.error(
          "ALMA50 can be applied to PS5, Tables, or Foosball stations in your selection."
        );
        return;
      }
      setAppliedCoupons((prev) => {
        let updated = { ...prev };
        if (selectedHasPS5) updated["ps5"] = "ALMA50";
        if (selectedHas8Ball) updated["8ball"] = "ALMA50";
        if (selectedHasFoosball) updated["foosball"] = "ALMA50";
        return updated;
      });
      let msg = "🏫 ALMA50 applied! 50% OFF for ";
      const types = [];
      if (selectedHasPS5) types.push("PS5");
      if (selectedHas8Ball) types.push("8-Ball");
      if (selectedHasFoosball) types.push("Foosball");
      msg += types.join(" & ") + " stations!";
      toast.success(msg);
      return;
    }
  }

  const handleCouponApply = () => {
    applyCoupon(couponCode);
    setCouponCode("");
  };

  const calculateOriginalPrice = () => {
    if (selectedStations.length === 0 || !selectedSlot) return 0;
    const numberOfSlots = selectedSlotRange.length > 0 ? selectedSlotRange.length : 1;
    const stationPrice = stations
      .filter((s) => selectedStations.includes(s.id))
      .reduce((sum, s) => {
        // Price per 30-minute slot (half of hourly rate)
        return sum + (s.hourly_rate / 2);
      }, 0);
    return stationPrice * numberOfSlots;
  };

  const calculateDiscount = () => {
    const original = calculateOriginalPrice();
    if (original === 0) return { total: 0, breakdown: {} as Record<string, number> };
    if (!Object.keys(appliedCoupons).length)
      return { total: 0, breakdown: {} as Record<string, number> };

    if (appliedCoupons["all"]) {
      if (appliedCoupons["all"] === "AXEIST")
        return { total: original, breakdown: { all: original } };
      if (appliedCoupons["all"] === "TES1342") {
        // Test coupon: Set price to ₹1 (discount = original - 1)
        const disc = Math.max(original - 1, 0);
        return { total: disc, breakdown: { all: disc } };
      }
      if (appliedCoupons["all"] === "GAMEHAUS25") {
        const disc = original * 0.25;
        return { total: disc, breakdown: { all: disc } };
      }
      if (appliedCoupons["all"] === "GAMEHAUS50") {
        const disc = original * 0.5;
        return { total: disc, breakdown: { all: disc } };
      }
      return { total: 0, breakdown: {} as Record<string, number> };
    }

    let totalDiscount = 0;
    const breakdown: Record<string, number> = {};

    if (
      appliedCoupons["8ball"] === "HH99" &&
      appliedCoupons["ps5"] === "NIT50"
    ) {
      const eightBalls = stations.filter(
        (s) => selectedStations.includes(s.id) && s.type === "8ball"
      );
      const sum = eightBalls.reduce((x, s) => x + s.hourly_rate, 0);
      const d = sum - eightBalls.length * 99;
      if (d > 0) {
        totalDiscount += d;
        breakdown["8-Ball (HH99)"] = d;
      }
      const ps5s = stations.filter(
        (s) => selectedStations.includes(s.id) && s.type === "ps5"
      );
      const sum2 = ps5s.reduce((x, s) => x + s.hourly_rate, 0);
      const d2 = sum2 - ps5s.length * 75;
      totalDiscount += d2;
      breakdown["PS5 (HH99+NIT50)"] = d2;
    } else {
      if (appliedCoupons["8ball"] === "HH99") {
        const eightBalls = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "8ball"
        );
        const sum = eightBalls.reduce((x, s) => x + s.hourly_rate, 0);
        const d = sum - eightBalls.length * 99;
        if (d > 0) {
          totalDiscount += d;
          breakdown["8-Ball (HH99)"] = d;
        }
      }

      if (appliedCoupons["ps5"] === "HH99") {
        const ps5s = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "ps5"
        );
        const sum = ps5s.reduce((x, s) => x + s.hourly_rate, 0);
        const d = sum - ps5s.length * 99;
        if (d > 0) {
          totalDiscount += d;
          breakdown["PS5 (HH99)"] = d;
        }
      }

      if (appliedCoupons["foosball"] === "HH99") {
        const foosballs = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "foosball"
        );
        const sum = foosballs.reduce((x, s) => x + s.hourly_rate, 0);
        const d = sum - foosballs.length * 99;
        if (d > 0) {
          totalDiscount += d;
          breakdown["Foosball (HH99)"] = d;
        }
      }

      if (appliedCoupons["8ball"] === "NIT50" || appliedCoupons["8ball"] === "ALMA50") {
        const balls = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "8ball"
        );
        const sum = balls.reduce((x, s) => x + s.hourly_rate, 0);
        const d = sum * 0.5;
        totalDiscount += d;
        breakdown[`8-Ball (${appliedCoupons["8ball"]})`] = d;
      }

      if (appliedCoupons["ps5"] === "NIT50" || appliedCoupons["ps5"] === "ALMA50") {
        const ps5s = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "ps5"
        );
        const sum = ps5s.reduce((x, s) => x + s.hourly_rate, 0);
        const d = sum * 0.5;
        totalDiscount += d;
        breakdown[`PS5 (${appliedCoupons["ps5"]})`] = d;
      }

      if (appliedCoupons["foosball"] === "NIT50" || appliedCoupons["foosball"] === "ALMA50") {
        const foosballs = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "foosball"
        );
        const sum = foosballs.reduce((x, s) => x + s.hourly_rate, 0);
        const d = sum * 0.5;
        totalDiscount += d;
        breakdown[`Foosball (${appliedCoupons["foosball"]})`] = d;
      }
    }

    return { total: totalDiscount, breakdown };
  };

  const originalPrice = calculateOriginalPrice();
  const discountObj = calculateDiscount();
  const discount = discountObj.total;
  const discountBreakdown = discountObj.breakdown;
  const finalPrice = Math.max(originalPrice - discount, 0);

  // Calculate number of selected slots
  const numberOfSelectedSlots = selectedSlotRange.length > 0 ? selectedSlotRange.length : (selectedSlot ? 1 : 0);
  // Allow 30-minute (1 slot) bookings when pay at venue is enabled, otherwise require 2 slots (60 minutes)
  const hasMinimumSlots = payAtVenueEnabled ? numberOfSelectedSlots >= 1 : numberOfSelectedSlots >= 2;

  const isCustomerInfoComplete = () =>
    hasSearched && customerNumber.trim() !== "" && customerInfo.name.trim() !== "";
  const isStationSelectionAvailable = () => isCustomerInfoComplete();
  const isTimeSelectionAvailable = () =>
    isStationSelectionAvailable() && selectedStations.length > 0;

  // ✅ UPDATED: createVenueBooking with duplicate check and Customer ID
  async function createVenueBooking() {
    setLoading(true);
    try {
      // Check minimum slots requirement
      const slotsToBook = selectedSlotRange.length > 0 ? selectedSlotRange : [selectedSlot!];
      const minSlotsRequired = payAtVenueEnabled ? 1 : 2;
      if (slotsToBook.length < minSlotsRequired) {
        const errorMessage = payAtVenueEnabled 
          ? "Please select at least 1 slot (30 minutes)."
          : "Minimum booking is 2 slots (60 minutes). Please select at least 2 consecutive slots.";
        toast.error(errorMessage);
        setLoading(false);
        return;
      }
      
      let customerId = customerInfo.id;
      
      if (!customerId) {
        const normalizedPhone = normalizePhoneNumber(customerInfo.phone);
        
        const validation = validatePhoneNumber(normalizedPhone);
        if (!validation.valid) {
          toast.error(validation.error || "Invalid phone number");
          setLoading(false);
          return;
        }

        // ✅ Check for duplicate phone number
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id, name, custom_id")
          .eq("phone", normalizedPhone)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
          toast.info(`Using existing customer: ${existingCustomer.name}`);
        } else {
          const customerID = generateCustomerID(normalizedPhone);

          const { data: newCustomer, error: customerError } = await supabase
            .from("customers")
            .insert({
              name: customerInfo.name,
              phone: normalizedPhone,
              email: customerInfo.email || null,
              custom_id: customerID,
              is_member: false,
              loyalty_points: 0,
              total_spent: 0,
              total_play_time: 0,
            })
            .select("id")
            .single();
            
          if (customerError) {
            if (customerError.code === '23505') {
              toast.error("This phone number is already registered. Please search for your account.");
              setLoading(false);
              return;
            }
            throw customerError;
          }
          customerId = newCustomer.id;
          toast.success(`New customer created: ${customerID}`);
        }
      }

      const couponCodes = Object.values(appliedCoupons).join(",");
      const bookingDuration = 30; // 30 minutes per slot
      
      // Validate booking slots for conflicts BEFORE creating
      for (const slot of slotsToBook) {
        for (const stationId of selectedStations) {
          const { data: hasOverlap, error: overlapError } = await (supabase as any).rpc('check_booking_overlap', {
            p_station_id: stationId,
            p_booking_date: format(selectedDate, "yyyy-MM-dd"),
            p_start_time: slot.start_time,
            p_end_time: slot.end_time,
            p_exclude_booking_id: null,
          });

          if (overlapError) {
            console.error("Error checking booking overlap:", overlapError);
            // Continue - database trigger will catch it
          } else if (hasOverlap === true) {
            // Get detailed conflict information for debugging
            const { data: conflictingBookings } = await supabase
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
              .eq("station_id", stationId)
              .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
              .in("status", ["confirmed", "in-progress"])
              .order("created_at", { ascending: false })
              .limit(10);
            
            // Standard overlap check (no midnight handling needed - slots end at 23:59:59)
            const slotStart = slot.start_time;
            const slotEnd = slot.end_time;
            
            const actualConflicts = conflictingBookings?.filter(b => {
              const bStart = b.start_time;
              const bEnd = b.end_time;
              
              return (
                (bStart <= slotStart && bEnd > slotStart) ||
                (bStart < slotEnd && bEnd >= slotEnd) ||
                (bStart >= slotStart && bEnd <= slotEnd) ||
                (bStart <= slotStart && bEnd >= slotEnd)
              );
            }) || [];

            console.error("🔍 Conflict details:", {
              slot: `${slot.start_time}-${slot.end_time}`,
              station_id: stationId,
              conflicting_bookings: actualConflicts.map(b => ({
                id: b.id,
                time: `${b.start_time}-${b.end_time}`,
                status: b.status,
                created_at: b.created_at
              }))
            });

            // Get station name for error message
            const station = stations.find(s => s.id === stationId);
            const stationName = station?.name || "this station";
            
            if (actualConflicts.length > 0) {
              const conflictDetails = actualConflicts.map(b => 
                `Booking ${b.id.slice(0, 8)}: ${b.start_time}-${b.end_time} (${b.status})`
              ).join(", ");
              throw new Error(`This time slot (${slot.start_time} - ${slot.end_time}) is already booked for ${stationName}. Conflicting: ${conflictDetails}`);
            } else {
              // Database says conflict but we can't find the booking - likely a bug
              console.warn("⚠️ Database reports conflict but no conflicting bookings found - possible bug in check_booking_overlap function");
              throw new Error(`This time slot (${slot.start_time} - ${slot.end_time}) appears to be booked for ${stationName}, but we cannot find the conflicting booking. Please contact support.`);
            }
          }
        }
      }
      
      // Create a booking row for each slot
      const rows: any[] = [];
      slotsToBook.forEach((slot) => {
        selectedStations.forEach((stationId) => {
          rows.push({
            station_id: stationId,
            customer_id: customerId!,
            booking_date: format(selectedDate, "yyyy-MM-dd"),
            start_time: slot.start_time,
            end_time: slot.end_time,
            duration: bookingDuration,
            status: "confirmed",
            original_price: originalPrice / slotsToBook.length / selectedStations.length,
            discount_percentage: discount > 0 ? (discount / originalPrice) * 100 : null,
            final_price: finalPrice / slotsToBook.length / selectedStations.length,
            coupon_code: couponCodes || null,
          });
        });
      });

      const { data: inserted, error: bookingError } = await supabase
        .from("bookings")
        .insert(rows)
        .select("id");
        
      if (bookingError) {
        // Check if error is due to booking conflict
        if (bookingError.code === '23505' || bookingError.message?.includes('Booking conflict')) {
          throw new Error("This time slot is already booked. Please select a different time.");
        }
        throw bookingError;
      }

      const stationObjects = stations.filter((s) =>
        selectedStations.includes(s.id)
      );
      
      const sessionDuration = `${slotsToBook.length * 30} minutes (${slotsToBook.length} slots)`;
      
      setBookingConfirmationData({
        bookingId: inserted[0].id.slice(0, 8).toUpperCase(),
        customerName: customerInfo.name,
        stationNames: stationObjects.map((s) => s.name),
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime: new Date(`2000-01-01T${slotsToBook[0].start_time}`).toLocaleTimeString(
          "en-US",
          { hour: "numeric", minute: "2-digit", hour12: true }
        ),
        endTime: new Date(`2000-01-01T${slotsToBook[slotsToBook.length - 1].end_time}`).toLocaleTimeString(
          "en-US",
          { hour: "numeric", minute: "2-digit", hour12: true }
        ),
        totalAmount: finalPrice,
        couponCode: couponCodes || undefined,
        discountAmount: discount > 0 ? discount : undefined,
        sessionDuration: sessionDuration,
      });
      setShowConfirmationDialog(true);

      toast.success("🎉 Booking confirmed! Get ready to game! 🎮");

      setSelectedStations([]);
      setSelectedSlot(null);
      setSelectedSlotRange([]);
      setCustomerNumber("");
      setCustomerInfo({ name: "", phone: "", email: "" });
      setIsReturningCustomer(false);
      setHasSearched(false);
      setCouponCode("");
      setAppliedCoupons({});
      setAvailableSlots([]);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const initiateRazorpay = async () => {
    // 1. Validate inputs
    const slotsToBook = selectedSlotRange.length > 0 ? selectedSlotRange : (selectedSlot ? [selectedSlot] : []);
    
    // Check minimum slots requirement
    if (slotsToBook.length < 2) {
      toast.error("Minimum booking is 2 slots (60 minutes). Please select at least 2 consecutive slots.");
      return;
    }
    
    // finalPrice already includes all slots (calculateOriginalPrice multiplies by numberOfSlots)
    // So we don't need to multiply again
    const totalPrice = finalPrice;

    if (totalPrice <= 0) {
      toast.error("Amount must be greater than 0 for online payment.");
      return;
    }

    if (!(window as any).Razorpay) {
      toast.error("Payment gateway is loading. Please wait a moment and try again.");
      return;
    }

    setLoading(true);
    try {
      // 2. Store pending booking in localStorage
      const bookingDuration = getBookingDuration(selectedStations, stations);
      const pendingBooking = {
        selectedStations,
        selectedDateISO: format(selectedDate, "yyyy-MM-dd"),
        slots: slotsToBook.map(slot => ({
          start_time: slot.start_time,
          end_time: slot.end_time,
        })),
        duration: bookingDuration,
        customer: customerInfo,
        pricing: {
          // originalPrice and discount already include all slots, no need to multiply again
          original: originalPrice,
          discount: discount,
          final: totalPrice,
          coupons: Object.values(appliedCoupons).join(","),
        },
      };
      localStorage.setItem("pendingBooking", JSON.stringify(pendingBooking));

      // 3. Create order on server with full booking data
      // IMPORTANT: bookingData is stored in order notes so webhook can create booking automatically
      // This ensures bookings are created even if customer doesn't return to browser after payment
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: totalPrice,
          receipt: genTxnId(),
          notes: {
            customer_name: customerInfo.name,
            customer_phone: customerInfo.phone,
            customer_email: customerInfo.email || "",
            booking_date: format(selectedDate, "yyyy-MM-dd"),
            stations: selectedStations.join(","),
          },
          bookingData: pendingBooking, // Send full booking data for webhook (PRIMARY METHOD)
        }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData?.ok) {
        throw new Error(orderData?.error || "Failed to create payment order");
      }

      // 4. Get Razorpay Key ID
      const keyRes = await fetch("/api/razorpay/get-key-id");
      const keyData = await keyRes.json();

      if (!keyRes.ok || !keyData?.ok) {
        throw new Error(keyData?.error || "Failed to get payment gateway key");
      }

      // 5. Initialize Razorpay checkout
      const options = {
        key: keyData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
          name: `${BRAND_NAME} – Premier Snooker & Gaming Lounge`,
        description: `Booking for ${slotsToBook.length} slot(s)`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // Redirect immediately - don't wait for reconciliation
          // Success page will handle reconciliation and booking lookup
          console.log("✅ Payment successful, redirecting to success page...");
          
          // Redirect immediately (non-blocking)
          window.location.href = `/public/payment/success?payment_id=${encodeURIComponent(response.razorpay_payment_id)}&order_id=${encodeURIComponent(response.razorpay_order_id)}&signature=${encodeURIComponent(response.razorpay_signature)}`;
          
          // Try reconciliation in background (non-blocking, don't wait)
          fetch("/api/razorpay/reconcile-payment", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
            }),
          }).catch(() => {
            // Ignore errors - success page will handle it
          });
        },
        prefill: {
          name: customerInfo.name,
          email: customerInfo.email || "",
          contact: customerInfo.phone,
        },
        theme: {
          color: "#FF4A1A", // Gamehaus Flame
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            toast.info("Payment was cancelled");
          },
        },
      };

      // Show warning dialog before opening payment gateway
      setShowPaymentWarning(true);
      
      // Auto-dismiss warning after 4 seconds (gives user time to read it)
      const warningTimer = setTimeout(() => {
        setShowPaymentWarning(false);
      }, 4000);

      const rzp = new (window as any).Razorpay(options);

      // Close warning when payment gateway opens (if ready event fires)
      rzp.on("ready", function() {
        clearTimeout(warningTimer);
        setShowPaymentWarning(false);
      });

      rzp.on("payment.failed", function (response: any) {
        clearTimeout(warningTimer);
        setShowPaymentWarning(false);
        const error = response.error?.description || response.error?.reason || "Payment failed";
        toast.error(`Payment failed: ${error}`);
        setLoading(false);
        window.location.href = `/public/payment/failed?order_id=${encodeURIComponent(orderData.orderId)}&error=${encodeURIComponent(error)}`;
      });

      rzp.open();
      
      // Close warning after payment gateway is opened (fallback)
      setTimeout(() => {
        setShowPaymentWarning(false);
      }, 3500);
    } catch (e: any) {
      console.error("Razorpay payment error:", e);
      setShowPaymentWarning(false);
      toast.error(`Unable to start payment: ${e?.message || e}`);
      setLoading(false);
    }
  };

  async function handleConfirm() {
    if (!isCustomerInfoComplete()) {
      toast.error("Please complete customer information first");
      return;
    }
    if (selectedStations.length === 0) {
      toast.error("Please select at least one station");
      return;
    }
    if (!selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }
    if (!hasMinimumSlots) {
      const errorMessage = payAtVenueEnabled 
        ? "Please select at least 1 slot (30 minutes)."
        : "Minimum booking is 2 slots (60 minutes). Please select at least 2 consecutive slots.";
      toast.error(errorMessage);
      return;
    }
    if (!customerInfo.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    // Show warning immediately when user clicks confirm
    if (paymentMethod === "razorpay") {
      setShowPaymentWarning(true);
    }

    if (paymentMethod === "venue") {
      await createVenueBooking();
    } else {
      await initiateRazorpay();
    }
  }

  function maskPhone(p?: string) {
    if (!p) return "******";
    return "******";
  }

  function maskName(name?: string) {
    if (!name || name === "—") return "******";
    return "******";
  }

  async function fetchTodaysBookings() {
    setTodayLoading(true);
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select(
          "id, booking_date, start_time, end_time, status, station_id, customer_id"
        )
        .eq("booking_date", todayStr)
        .order("start_time", { ascending: true });

      if (error) throw error;
      if (!bookingsData?.length) {
        setTodayRows([]);
        setTodayLoading(false);
        return;
      }

      const stationIds = [...new Set(bookingsData.map((b) => b.station_id))];
      const customerIds = [...new Set(bookingsData.map((b) => b.customer_id))];

      const [{ data: stationsData }, { data: customersData }] = await Promise.all([
        supabase.from("stations").select("id, name").in("id", stationIds),
        supabase.from("customers").select("id, name, phone").in("id", customerIds),
      ]);

      const rows: TodayBookingRow[] = bookingsData.map((b) => {
        const st = stationsData?.find((s) => s.id === b.station_id);
        const cu = customersData?.find((c) => c.id === b.customer_id);
        return {
          id: b.id,
          booking_date: b.booking_date,
          start_time: b.start_time,
          end_time: b.end_time,
          status: b.status as TodayBookingRow["status"],
          station_id: b.station_id,
          customer_id: b.customer_id,
          stationName: st?.name || "—",
          customerName: maskName(cu?.name),
          customerPhone: maskPhone(cu?.phone),
        };
      });

      setTodayRows(rows);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load today's bookings");
    } finally {
      setTodayLoading(false);
    }
  }

  const timeKey = (s: string, e: string) => {
    const start = new Date(`2000-01-01T${s}`);
    const end = new Date(`2000-01-01T${e}`);
    return `${start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })} — ${end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  };

  const groupedByTime = useMemo(() => {
    const map = new Map<string, TodayBookingRow[]>();
    todayRows.forEach((r) => {
      const k = timeKey(r.start_time, r.end_time);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    const entries = Array.from(map.entries()).sort(([a], [b]) => {
      const aStart = parse(a.split(" — ")[0], "h:mm a", new Date()).getTime();
      const bStart = parse(b.split(" — ")[0], "h:mm a", new Date()).getTime();
      return aStart - bStart;
    });
    return entries;
  }, [todayRows]);

  const statusChip = (s: TodayBookingRow["status"]) => {
    const base = "px-2 py-0.5 rounded-full text-xs capitalize";
    switch (s) {
      case "confirmed":
        return (
          <span
            className={cn(
              base,
              "bg-blue-500/15 text-blue-300 border border-blue-400/20"
            )}
          >
            confirmed
          </span>
        );
      case "in-progress":
        return (
          <span
            className={cn(
              base,
              "bg-amber-500/15 text-amber-300 border border-amber-400/20"
            )}
          >
            in-progress
          </span>
        );
      case "completed":
        return (
          <span
            className={cn(
              base,
              "bg-gamehaus-purple/15 text-gamehaus-lightpurple border border-gamehaus-purple/20"
            )}
          >
            completed
          </span>
        );
      case "cancelled":
        return (
          <span
            className={cn(
              base,
              "bg-rose-500/15 text-rose-300 border border-rose-400/20"
            )}
          >
            cancelled
          </span>
        );
      case "no-show":
        return (
          <span
            className={cn(
              base,
              "bg-zinc-500/15 text-zinc-300 border border-zinc-400/20"
            )}
          >
            no-show
          </span>
        );
      default:
        return (
          <span
            className={cn(
              base,
              "bg-zinc-500/15 text-zinc-300 border border-zinc-400/20"
            )}
          >
            {s}
          </span>
        );
    }
  };

  return (
    <>
      {/* Payment Warning Dialog - Non-dismissible */}
      <Dialog open={showPaymentWarning} onOpenChange={() => {}}>
        <DialogContent className="bg-gradient-to-br from-red-950/95 to-orange-950/95 border-2 border-red-500/50 shadow-2xl max-w-md z-[9999]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
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

    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] via-[#1a0f1a] to-[#1a1a1a]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gamehaus-purple/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-gamehaus-cyan/20 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-gamehaus-magenta/20 blur-3xl" />
      </div>

      {/* Coupon Promotional Popup - Hidden for now */}
      {/* <CouponPromotionalPopup onCouponSelect={applyCoupon} /> */}

      <header className="py-10 px-4 sm:px-6 md:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6">
              <img
                src={LOGO_PATH}
                alt="Gamehaus – Premier Snooker & Gaming Lounge"
                className="h-24 drop-shadow-[0_0_25px_rgba(168,85,247,0.15)] cursor-pointer transition-transform hover:scale-105"
                onClick={() => setShowPinDialog(true)}
                title="Click for secret feature"
              />
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-widest uppercase text-gray-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-gamehaus-magenta" />
              Premium Gaming Lounge
            </span>

            <h1 className="mt-3 text-4xl md:text-5xl font-extrabold text-white">
              Book Your Gaming Session
            </h1>
            <p className="mt-2 text-lg text-gray-300/90 max-w-2xl text-center">
              Reserve PlayStation 5, Pool Table, or Foosball Table sessions at {BRAND_NAME}
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-300 backdrop-blur-md">
              <span className="font-semibold tracking-wide">Line of Business:</span>
              <span>
                Amusement & Gaming Lounge Services (time-based PS5, 8-Ball & Foosball rentals)
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pb-14 relative z-10">
        <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-300">
          <h2 className="mb-1 text-base font-semibold text-white">About {BRAND_NAME}</h2>
          <p>
            {BRAND_NAME} offers <span className="font-medium">time-based rentals</span> of
            PlayStation 5 stations, 8-Ball pool tables, and foosball tables. Book
            your session in convenient 30-minute slots.
          </p>
          <p className="mt-2 text-gray-400">
            <span className="font-medium text-gray-200">Pricing:</span> All prices are
            displayed in <span className="ml-1 font-semibold">INR (₹)</span>.
          </p>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-gamehaus-purple/20 ring-1 ring-white/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-gamehaus-purple" />
                  </div>
                  Step 1: Customer Information
                  {isCustomerInfoComplete() && (
                    <CheckCircle className="h-5 w-5 text-green-400 ml-auto" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gamehaus-purple/10 border border-gamehaus-purple/20 rounded-xl p-3">
                  <p className="text-sm text-gamehaus-purple/90 font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Please complete customer
                    information to proceed with booking
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={customerNumber}
                    onChange={(e) => {
                      const value = e.target.value;
                      const normalized = normalizePhoneNumber(value);
                      
                      if (normalized.length <= 10) {
                        setCustomerNumber(normalized);
                        setHasSearched(false);
                        setIsReturningCustomer(false);
                        setCustomerInfo((prev) => ({
                          ...prev,
                          name: "",
                          email: "",
                          phone: normalized,
                        }));
                      }
                    }}
                    placeholder="Enter 10-digit phone number"
                    className="bg-black/30 border-white/10 text-white placeholder:text-gray-400 rounded-xl flex-1"
                    maxLength={10}
                  />
                  <Button
                    onClick={searchCustomer}
                    disabled={searchingCustomer}
                    className="rounded-xl bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta"
                  >
                    {searchingCustomer ? "Searching..." : "Search"}
                  </Button>
                </div>

                {hasSearched && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-gray-300 uppercase">
                        Full Name{" "}
                        {isReturningCustomer && (
                          <CheckCircle className="inline h-4 w-4 text-green-400 ml-1" />
                        )}
                      </Label>
                      <Input
                        value={customerInfo.name}
                        onChange={(e) =>
                          setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Enter your full name"
                        className="mt-1 bg-black/30 border-white/10 text-white placeholder:text-gray-500 rounded-xl"
                        disabled={isReturningCustomer}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-300 uppercase">
                        Email (Optional)
                      </Label>
                      <Input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) =>
                          setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="Enter your email address"
                        className="mt-1 bg-black/30 border-white/10 text-white placeholder:text-gray-500 rounded-xl"
                        disabled={isReturningCustomer}
                      />
                    </div>
                  </div>
                )}

                {isCustomerInfoComplete() && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="h-4 w-4" /> Customer information complete!
                    You can now proceed to station selection.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <CardHeader className="relative pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-white/10 bg-gradient-to-br from-gamehaus-cyan/25 to-transparent">
                      {!isStationSelectionAvailable() ? (
                        <Lock className="h-4 w-4 text-gray-500" />
                      ) : (
                        <MapPin className="h-4 w-4 text-gamehaus-cyan" />
                      )}
                    </div>
                    <CardTitle className="m-0 p-0 text-white">
                      Step 2: Select Gaming Stations
                    </CardTitle>
                  </div>
                  {isStationSelectionAvailable() && selectedStations.length > 0 && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-gamehaus-purple/20 bg-gamehaus-purple/10 px-2.5 py-1 text-xs text-gamehaus-lightpurple">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {selectedStations.length} selected
                    </div>
                  )}
                </div>
                <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </CardHeader>
              <CardContent className="relative pt-3">
                <div
                  className={cn(
                    "grid grid-cols-4 gap-2 sm:gap-3 mb-4",
                    !isStationSelectionAvailable() && "pointer-events-none"
                  )}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStationType("all")}
                    className={cn(
                      "h-9 rounded-full border-white/15 text-[12px]",
                      stationType === "all"
                        ? "bg-white/12 text-gray-100"
                        : "bg-transparent text-gray-300"
                    )}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStationType("ps5")}
                    className={cn(
                      "h-9 rounded-full border-white/15 text-[12px]",
                      stationType === "ps5"
                        ? "bg-gamehaus-purple/15 text-gamehaus-purple"
                        : "bg-transparent text-gamehaus-purple"
                    )}
                  >
                    PS5
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStationType("8ball")}
                    className={cn(
                      "h-9 rounded-full border-white/15 text-[12px]",
                      stationType === "8ball"
                        ? "bg-gamehaus-purple/15 text-gamehaus-lightpurple"
                        : "bg-transparent text-gamehaus-lightpurple"
                    )}
                  >
                    Tables
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStationType("foosball")}
                    className={cn(
                      "h-9 rounded-full border-white/15 text-[12px]",
                      stationType === "foosball"
                        ? "bg-amber-500/15 text-amber-200"
                        : "bg-transparent text-amber-200"
                    )}
                  >
                    Foosball
                  </Button>
                </div>

                {!isStationSelectionAvailable() ? (
                  <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
                    <Lock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">
                      Complete customer information to unlock station selection
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 p-3 sm:p-4 bg-white/6">
                    <StationSelector
                      stations={
                        stationType === "all"
                          ? stations
                          : stations.filter((s) => s.type === stationType)
                      }
                      selectedStations={selectedStations}
                      onStationToggle={handleStationToggle}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-gamehaus-magenta/20 ring-1 ring-white/10 flex items-center justify-center">
                    {!isTimeSelectionAvailable() ? (
                      <Lock className="h-4 w-4 text-gray-500" />
                    ) : (
                      <CalendarIcon className="h-4 w-4 text-gamehaus-magenta" />
                    )}
                  </div>
                  Step 3: Choose Date & Time
                  {isTimeSelectionAvailable() && selectedSlot && (
                    <CheckCircle className="h-5 w-5 text-green-400 ml-auto" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isTimeSelectionAvailable() ? (
                  <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
                    <Lock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">
                      Select stations to unlock date and time selection
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-base font-medium text-gray-200">
                        Choose Date
                      </Label>
                      <div className="mt-2">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const compareDate = new Date(date);
                            compareDate.setHours(0, 0, 0, 0);
                            
                            return compareDate < today;
                          }}
                          className={cn(
                            "rounded-xl border bg-black/30 border-white/10 pointer-events-auto"
                          )}
                        />
                      </div>
                    </div>
                    {selectedStations.length > 0 && (
                      <div>
                        <Label className="text-base font-medium text-gray-200">
                          Available Time Slots
                        </Label>
                        <div className="mt-2">
                        <TimeSlotPicker
                          slots={availableSlots}
                          selectedSlot={selectedSlot}
                          selectedSlotRange={selectedSlotRange}
                          onSlotSelect={handleSlotSelect}
                          loading={slotsLoading}
                          payAtVenueEnabled={payAtVenueEnabled}
                        />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card ref={bookingSummaryRef} className="sticky top-4 bg-white/10 backdrop-blur-xl border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-white">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedStations.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-gray-400 uppercase">
                      Selected Stations
                    </Label>
                    <div className="mt-2 space-y-1">
                      {selectedStations.map((id) => {
                        const s = stations.find((x) => x.id === id);
                        if (!s) return null;
                        return (
                          <div key={id} className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-gamehaus-purple/20 border border-white/10 flex items-center justify-center">
                              {s.type === "ps5" ? (
                                <Gamepad2 className="h-3.5 w-3.5 text-gamehaus-purple" />
                              ) : s.type === "foosball" ? (
                                <Table2 className="h-3.5 w-3.5 text-amber-300" />
                              ) : (
                                <Timer className="h-3.5 w-3.5 text-green-400" />
                              )}
                            </div>
                            <Badge className="bg-white/5 border-white/10 text-gray-200 rounded-full px-2.5 py-1">
                              {s.name}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedDate && (
                  <div>
                    <Label className="text-xs font-semibold text-gray-400 uppercase">
                      Date
                    </Label>
                    <p className="mt-1 text-sm text-gray-200">
                      {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                )}

                {selectedSlot && (
                  <div>
                    <Label className="text-xs font-semibold text-gray-400 uppercase">
                      Session Duration & Time
                    </Label>
                    <p className="mt-1 text-sm text-gray-200">
                      {selectedSlotRange.length > 1 
                        ? `${selectedSlotRange.length} slots (${selectedSlotRange.length * 30} minutes)`
                        : '30 minutes'}
                    </p>
                    <p className="text-sm text-gray-200">
                      {new Date(`2000-01-01T${selectedSlotRange[0]?.start_time || selectedSlot.start_time}`).toLocaleTimeString(
                        "en-US",
                        { hour: "numeric", minute: "2-digit", hour12: true }
                      )}{" "}
                      —{" "}
                      {(() => {
                        const endTime = selectedSlotRange[selectedSlotRange.length - 1]?.end_time || selectedSlot.end_time;
                        // Display 23:59:59 as "12:00 AM" for user clarity
                        if (endTime === '23:59:59' || endTime === '23:59:59.000') {
                          return '12:00 AM';
                        }
                        return new Date(`2000-01-01T${endTime}`).toLocaleTimeString(
                          "en-US",
                          { hour: "numeric", minute: "2-digit", hour12: true }
                        );
                      })()}
                    </p>
                  </div>
                )}

                {/* Coupon Code Section */}
                <div>
                  <Label className="text-xs font-semibold text-gray-400 uppercase">
                    Coupon Code
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="bg-black/30 border-white/10 text-white placeholder:text-gray-500 rounded-xl flex-1"
                    />
                    <Button
                      onClick={handleCouponApply}
                      size="sm"
                      className="rounded-xl bg-green-600 hover:bg-green-700"
                    >
                      Apply
                    </Button>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">
                    All discounts and totals are calculated in INR (₹).
                  </p>

                  {Object.entries(appliedCoupons).length > 0 && (
                    <div className="mt-2 space-y-2">
                      {Object.entries(appliedCoupons).map(([key, val]) => {
                        let emoji = "🏷️";
                        if (val === "HH99") emoji = "⏰";
                        else if (val === "NIT50") emoji = "🎓";
                        else if (val === "GAMEHAUS25") emoji = "🎉";
                        else if (val === "GAMEHAUS50") emoji = "📚";
                        else if (val === "ALMA50") emoji = "🏫";
                        else if (val === "AXEIST") emoji = "🥷";
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between px-4 py-2 rounded-xl shadow-sm font-semibold"
                            style={{
                              background: "linear-gradient(90deg,#231743 10%,#181121 100%)",
                              border: "1px solid #A37CFF",
                              color: "#F7CBFF",
                              letterSpacing: "1.5px"
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{emoji}</span>
                              <span className="font-extrabold uppercase tracking-widest">{val}</span>
                              <span className="ml-2 text-xs font-semibold text-green-400">
                                Applied!
                              </span>
                            </div>
                            <button
                              onClick={() => removeCoupon(key)}
                              aria-label="Remove coupon"
                              className="ml-2 p-1 hover:bg-[#3B2159] rounded-full"
                            >
                              <X className="h-4 w-4 text-purple-200" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-2">
                  <Label className="text-xs font-semibold text-gray-400 uppercase">
                    Payment Method
                  </Label>
                  <div className="mt-2">
                    {payAtVenueEnabled ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPaymentMethod("venue")}
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm border transition-colors",
                            paymentMethod === "venue"
                              ? "bg-white/10 border-white/20 text-white"
                              : "bg-black/20 border-white/10 text-gray-300 hover:bg-black/30"
                          )}
                        >
                          Pay at Venue
                        </button>
                        <button
                          onClick={() => setPaymentMethod("razorpay")}
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm border transition-colors",
                            paymentMethod === "razorpay"
                              ? "bg-blue-500/20 border-blue-500/30 text-white"
                              : "bg-black/20 border-white/10 text-gray-300 hover:bg-black/30"
                          )}
                        >
                          Pay Online
                        </button>
                      </div>
                    ) : (
                      /* Razorpay Payment Option */
                      <div className="rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-400" />
                            <span className="text-sm font-semibold text-white">Pay Online</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-blue-400">Razorpay</span>
                            <div className="h-4 w-4 rounded bg-blue-500 flex items-center justify-center">
                              <span className="text-[8px] text-white font-bold">✓</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-300 leading-relaxed">
                          Secure payment powered by <span className="font-semibold text-blue-400">Razorpay</span>. 
                          Accepts all major credit/debit cards, UPI, netbanking, and digital wallets.
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                          <div className="flex items-center gap-1">
                            <div className="h-3 w-3 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                              <span className="text-[6px] text-green-400">🔒</span>
                            </div>
                            <span>SSL Secured</span>
                          </div>
                          <span>•</span>
                          <span>PCI DSS Compliant</span>
                          <span>•</span>
                          <span>Instant Confirmation</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {originalPrice > 0 && (
                  <>
                    <Separator className="bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-gray-300">Subtotal</Label>
                        <span className="text-sm text-gray-200">
                          {INR(originalPrice)}
                        </span>
                      </div>

                      {/* Discount Breakdown - Hidden for now */}
                      {discount > 0 && (
                        <div className="hidden">
                          <div className="border p-2 rounded bg-black/10 text-green-400">
                            <Label className="font-semibold text-xs uppercase">
                              Discount Breakdown
                            </Label>
                            <ul className="list-disc ml-5 mt-1 text-sm">
                              {Object.entries(discountBreakdown).map(([k, v]) => (
                                <li key={k}>
                                  {k}: -{INR(v)}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex justify-between items-center">
                            <Label className="text-sm text-green-400">
                              Total Discount
                            </Label>
                            <span className="text-sm text-green-400">-{INR(discount)}</span>
                          </div>
                        </div>
                      )}

                      <Separator className="bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                      <div className="flex justify-between items-center">
                        <Label className="text-base font-semibold text-gray-100">
                          Total Amount
                        </Label>
                        <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta">
                          {INR(finalPrice)}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <Button
                  onClick={handleConfirm}
                  disabled={
                    !selectedSlot || selectedStations.length === 0 || !customerNumber || !hasMinimumSlots || loading
                  }
                  className="w-full rounded-xl bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta"
                  size="lg"
                >
                  {loading
                    ? paymentMethod === "venue" 
                      ? "Confirming Booking..."
                      : "Starting Payment..."
                    : paymentMethod === "venue"
                    ? "Confirm Booking (Pay at Venue)"
                    : "Confirm & Pay Online"}
                </Button>
                
                {selectedSlot && !hasMinimumSlots && (
                  <p className="text-xs text-amber-400 text-center mt-2">
                    {payAtVenueEnabled 
                      ? "⚠️ Please select at least 1 slot (30 minutes)."
                      : "⚠️ Minimum booking is 2 slots (60 minutes). Please select at least 2 consecutive slots."}
                  </p>
                )}

                <p className="text-xs text-gray-400 text-center">
                  All prices are shown in <span className="font-semibold">INR (₹)</span>.{" "}
                  {paymentMethod === "venue" 
                    ? "Payment will be collected at the venue."
                    : <>You will complete payment securely via <span className="font-semibold text-blue-400">Razorpay</span>.</>}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-white font-semibold mb-2">
              Terms & Conditions (Summary)
            </h3>
            <ul className="ml-5 list-disc text-sm text-gray-300 space-y-1.5">
              <li>Bookings are for specified time slots; extensions are subject to availability.</li>
              <li>Arrive on time; late arrivals may reduce play time without fee adjustment.</li>
              <li>Damage to equipment may incur charges as per in-store policy.</li>
              <li>Management may refuse service in cases of misconduct or safety concerns.</li>
              <li>All prices are in <strong>INR (₹)</strong>.</li>
            </ul>
            <button
              onClick={() => {
                setLegalDialogType("terms");
                setShowLegalDialog(true);
              }}
              className="mt-3 text-sm text-gamehaus-magenta hover:underline"
            >
              View full Terms & Conditions
            </button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-white font-semibold mb-2">Privacy Policy (Summary)</h3>
            <ul className="ml-5 list-disc text-sm text-gray-300 space-y-1.5">
              <li>We collect minimal personal data (name, phone, optional email).</li>
              <li>Data is stored securely and used only for bookings/updates.</li>
              <li>No selling of data; limited sharing only to fulfill your booking.</li>
              <li>Contact us to correct or delete your data.</li>
            </ul>
            <button
              onClick={() => {
                setLegalDialogType("privacy");
                setShowLegalDialog(true);
              }}
              className="mt-3 text-sm text-gamehaus-magenta hover:underline"
            >
              View full Privacy Policy
            </button>
          </div>
        </section>

        <div className="mt-10">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-gamehaus-magenta" />
                Today's Bookings
              </CardTitle>
              <span className="text-xs text-gray-300 rounded-full border border-white/10 px-2 py-0.5">
                {todayRows.length} total
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayLoading ? (
                <div className="h-12 rounded-md bg-white/5 animate-pulse" />
              ) : groupedByTime.length === 0 ? (
                <div className="text-sm text-gray-400">No bookings today.</div>
              ) : (
                groupedByTime.map(([timeLabel, rows]) => (
                  <details
                    key={timeLabel}
                    className="group rounded-xl border border-white/10 bg-black/30 open:bg-black/40"
                  >
                    <summary className="list-none cursor-pointer select-none px-3 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-200">
                        <Clock className="h-4 w-4 text-gamehaus-magenta" />
                        <span className="font-medium">{timeLabel}</span>
                      </div>
                      <span className="text-xs text-gray-300 rounded-full border border-white/10 px-2 py-0.5">
                        {rows.length} booking{rows.length !== 1 ? "s" : ""}
                      </span>
                    </summary>
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 overflow-x-auto">
                      <table className="min-w-[520px] w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400">
                            <th className="py-2 pr-3 font-medium">Customer</th>
                            <th className="py-2 pr-3 font-medium">Station</th>
                            <th className="py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.id} className="border-t border-white/10">
                              <td className="py-2 pr-3">
                                <div className="text-gray-100">{r.customerName}</div>
                                <div className="text-xs text-gray-400">{r.customerPhone}</div>
                              </td>
                              <td className="py-2 pr-3">
                                <Badge className="bg-white/5 border-white/10 text-gray-200 rounded-full">
                                  {r.stationName}
                                </Badge>
                              </td>
                              <td className="py-2">{statusChip(r.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="py-10 px-4 sm:px-6 md:px-8 border-t border-white/10 backdrop-blur-md bg-black/30 relative z-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center mb-4 md:mb-0">
              <img
                src={LOGO_PATH}
                alt="Gamehaus – Premier Snooker & Gaming Lounge"
                className="h-8 mr-3 cursor-pointer transition-transform hover:scale-105"
                onClick={() => setShowPinDialog(true)}
                title="Click for secret feature"
              />
              <p className="text-gray-400 text-sm">
                © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-400 text-sm">
                <Clock className="h-4 w-4 text-gray-400 mr-1.5" />
                <span>Book anytime, anywhere</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-wrap justify-center md:justify-start gap-6">
              <button
                onClick={() => {
                  setLegalDialogType("terms");
                  setShowLegalDialog(true);
                }}
                className="text-gray-400 hover:text-white hover:underline text-sm flex items-center gap-1 transition"
              >
                Terms & Conditions
              </button>
              <button
                onClick={() => {
                  setLegalDialogType("privacy");
                  setShowLegalDialog(true);
                }}
                className="text-gray-400 hover:text-white hover:underline text-sm flex items-center gap-1 transition"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => {
                  setLegalDialogType("contact");
                  setShowLegalDialog(true);
                }}
                className="text-gray-400 hover:text-white hover:underline text-sm flex items-center gap-1 transition"
              >
                Contact Us
              </button>
              <button
                onClick={() => setShowRefundDialog(true)}
                className="text-gray-400 hover:text-white hover:underline text-sm flex items-center gap-1 transition"
              >
                Refund Policy
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <a href="tel:+919345187098" className="hover:text-white transition-colors">
                  +91 93451 87098
                </a>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white transition-colors">
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {bookingConfirmationData && (
        <BookingConfirmationDialog 
          isOpen={showConfirmationDialog}
          onClose={() => setShowConfirmationDialog(false)}
          bookingData={bookingConfirmationData}
        />
      )}

      <LegalDialog 
        isOpen={showLegalDialog}
        onClose={() => setShowLegalDialog(false)}
        type={legalDialogType}
      />

      {showRefundDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0c13] p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Refund & Cancellation Policy</h3>
              <button
                aria-label="Close refund policy"
                onClick={() => setShowRefundDialog(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="prose prose-invert max-w-none text-sm text-gray-300">
              <p className="text-gray-400">
                This policy outlines how a booking for a gaming service made through the Platform can be canceled or refunded.
              </p>
              
              <h4 className="mt-4 text-white">Cancellations</h4>
              <ul className="ml-5 list-disc">
                <li>Requests must be made within <strong>1 day</strong> of placing the booking.</li>
                <li>Cancellation may not be possible if the session is already confirmed or about to commence.</li>
              </ul>

              <h4 className="mt-4 text-white">Non-Cancellable Services</h4>
              <ul className="ml-5 list-disc">
                <li>No cancellations for time-sensitive or non-refundable bookings.</li>
                <li>Refunds/rescheduling may be considered if the session wasn't provided as described.</li>
              </ul>

              <h4 className="mt-4 text-white">Service Quality Issues</h4>
              <ul className="ml-5 list-disc">
                <li>Report issues within <strong>1 day</strong> of the scheduled session.</li>
              </ul>

              <h4 className="mt-4 text-white">Refund Processing</h4>
              <ul className="ml-5 list-disc">
                <li>If approved, refunds are processed within <strong>3 days</strong> to the original payment method.</li>
              </ul>

              <p className="mt-4 text-xs text-gray-400">
                Need help? Call{' '}
                <a className="underline hover:text-white" href="tel:+919345187098">
                  +91 93451 87098
                </a>{' '}
                or email{' '}
                <a className="ml-1 underline hover:text-white" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      <PublicBookingUnavailableDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
      />

      {/* Secret PIN Dialog */}
      {showPinDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0c0c13] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Enter Secret PIN</h3>
              <button
                aria-label="Close PIN dialog"
                onClick={() => {
                  setShowPinDialog(false);
                  setPinInput("");
                }}
                className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-gray-300 mb-2 block">PIN</Label>
                <Input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 4) {
                      setPinInput(value);
                    }
                  }}
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                  className="bg-black/30 border-white/10 text-white placeholder:text-gray-500 rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pinInput.length === 4) {
                      if (pinInput === '1342') {
                        setPayAtVenueEnabled(true);
                        setPaymentMethod("venue");
                        toast.success("🎉 Secret feature unlocked! Pay at Venue option enabled.");
                        setShowPinDialog(false);
                        setPinInput("");
                      } else {
                        toast.error("❌ Invalid PIN. Please try again.");
                        setPinInput("");
                      }
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPinDialog(false);
                    setPinInput("");
                  }}
                  className="flex-1 rounded-xl bg-black/30 border-white/10 text-gray-300 hover:bg-black/50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (pinInput === '1342') {
                      setPayAtVenueEnabled(true);
                      setPaymentMethod("venue");
                      toast.success("🎉 Secret feature unlocked! Pay at Venue option enabled.");
                      setShowPinDialog(false);
                      setPinInput("");
                    } else {
                      toast.error("❌ Invalid PIN. Please try again.");
                      setPinInput("");
                    }
                  }}
                  disabled={pinInput.length !== 4}
                  className="flex-1 rounded-xl bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta"
                >
                  Verify
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
