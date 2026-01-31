import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Minus, Send, Sparkles, Gamepad2, Calendar as CalendarIcon, Clock, ArrowRight, Table2, Timer } from "lucide-react";
import { getGameboyReply } from "@/components/chat/gameboyBrain";
import { QUICK_TILES } from "@/components/chat/gameboyKnowledge";
import {
  buildPublicBookingUrl,
  fetchStations,
  formatSlotLabel,
  getAvailableSlotsUnion,
  lookupCustomerByPhone,
  normalizePhoneNumber,
  StationType,
  validateIndianPhoneNumber,
} from "@/components/chat/bookingActions";
import type { StationLite, TimeSlot } from "@/components/chat/bookingActions";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

type Role = "user" | "bot";

type ChatMessage = {
  id: string;
  role: Role;
  text: string;
  ts: number;
  isStreaming?: boolean;
};

type BookingFlow =
  | { active: false }
  | { active: true; step: "phone" }
  | { active: true; step: "name"; phone: string }
  | { active: true; step: "details"; phone: string; customerName?: string };

function uid(): string {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function formatTime(ts: number): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(ts);
  } catch {
    return "";
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="gh-typing-dot" />
      <span className="gh-typing-dot gh-typing-dot--2" />
      <span className="gh-typing-dot gh-typing-dot--3" />
    </div>
  );
}

export default function GameboyChatWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Public site only (avoid admin/POS dashboards)
  const shouldRender = useMemo(() => {
    if (user) return false;
    const p = location.pathname || "/";
    if (p === "/") return true;
    if (p === "/public/booking") return false; // requested: hide on public booking page
    if (p.startsWith("/public")) return true;
    return false;
  }, [location.pathname, user]);

  const quickTiles = useMemo(() => QUICK_TILES, []);

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [booking, setBooking] = useState<BookingFlow>({ active: false });
  const [unreadCount, setUnreadCount] = useState(0);
  const pendingNudgeRef = useRef(false);
  const [ringing, setRinging] = useState(false);
  const nudgeTimeoutRef = useRef<number | null>(null);
  const hasInteractedRef = useRef(false);
  const pendingAttentionRef = useRef(false); // sound/vibrate waiting for user gesture
  const bookingDoneRef = useRef(false);
  const BOOKING_DONE_KEY = "gh_gameboy_booking_done_v1";

  // Booking UI state (matches PublicBooking flow: type filter -> station select -> date -> time slot)
  const [stationTypeFilter, setStationTypeFilter] = useState<StationType | "all">("all");
  const [stations, setStations] = useState<StationLite[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlotTimes, setSelectedSlotTimes] = useState<string[]>([]);
  const [slotHint, setSlotHint] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const greet = getGameboyReply("hi", { firstMessage: true });
    return [
      {
        id: uid(),
        role: "bot",
        text: greet.text,
        ts: Date.now(),
      },
    ];
  });

  const panelWidth = 420;
  const panelHeight = 640;
  const mobileWidth = "calc(100vw - 24px)";

  const scrollAreaRootRef = useRef<React.ElementRef<typeof ScrollArea> | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [streamTick, setStreamTick] = useState(0);
  const botDelayTimeoutRef = useRef<number | null>(null);
  const botStreamIntervalRef = useRef<number | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const vp = scrollViewportRef.current;
    if (!vp) return;
    vp.scrollTo({ top: vp.scrollHeight, behavior });
  };

  const clearBotTimers = () => {
    if (botDelayTimeoutRef.current) {
      window.clearTimeout(botDelayTimeoutRef.current);
      botDelayTimeoutRef.current = null;
    }
    if (botStreamIntervalRef.current) {
      window.clearInterval(botStreamIntervalRef.current);
      botStreamIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearBotTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animateBotReply = (fullText: string) => {
    clearBotTimers();
    setIsTyping(true);
    scrollToBottom("auto");

    const delay = clamp(420 + Math.min(fullText.length, 220) * 6, 650, 1550);
    botDelayTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      const id = uid();
      const ts = Date.now();
      setMessages((prev) => [...prev, { id, role: "bot", text: "", ts, isStreaming: true }]);

      let i = 0;
      const step = 10; // chars per tick
      const intervalMs = 24;

      botStreamIntervalRef.current = window.setInterval(() => {
        i = Math.min(fullText.length, i + step);
        const next = fullText.slice(0, i);
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, text: next, isStreaming: i < fullText.length } : m))
        );
        setStreamTick((t) => t + 1);
        if (i >= fullText.length) {
          clearBotTimers();
        }
      }, intervalMs);
    }, delay);
  };

  useEffect(() => {
    if (!open) return;
    const root = scrollAreaRootRef.current;
    if (!root) return;
    const vp = root.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
    scrollViewportRef.current = vp;
    if (!vp) return;

    const onScroll = () => {
      const distance = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
      setStickToBottom(distance < 140);
    };
    vp.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      vp.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (!stickToBottom) return;
    scrollToBottom(isTyping ? "auto" : "smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, isTyping, streamTick, stickToBottom]);

  useEffect(() => {
    // If route changes, keep it closed to reduce distraction
    setOpen(false);
    setMinimized(false);
    setIsTyping(false);
    setBooking({ active: false });
    setUnreadCount(0);
    pendingNudgeRef.current = false;
    setRinging(false);
    setStations([]);
    setStationsLoading(false);
    setStationsError(null);
    setSelectedStationIds([]);
    setStationTypeFilter("all");
    setSelectedDate(new Date());
    setSlots([]);
    setSlotsLoading(false);
    setSelectedSlotTimes([]);
    setSlotHint(null);
  }, [location.pathname]);

  if (!shouldRender) return null;

  const readBookingDone = () => {
    try {
      return sessionStorage.getItem(BOOKING_DONE_KEY) === "1";
    } catch {
      return false;
    }
  };

  const clearNudgeTimers = () => {
    if (nudgeTimeoutRef.current) {
      window.clearTimeout(nudgeTimeoutRef.current);
      nudgeTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearNudgeTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track if user interacted at least once (audio autoplay restrictions)
  useEffect(() => {
    const onInteract = () => {
      hasInteractedRef.current = true;
      if (pendingAttentionRef.current) {
        pendingAttentionRef.current = false;
        playSoftChirp(); // try again after gesture
        tryVibrate();
      }
    };
    window.addEventListener("pointerdown", onInteract, { passive: true });
    window.addEventListener("keydown", onInteract);
    return () => {
      window.removeEventListener("pointerdown", onInteract as any);
      window.removeEventListener("keydown", onInteract as any);
    };
  }, []);

  const playSoftChirp = () => {
    try {
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const startTone = () => {
        const now = ctx.currentTime;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        // louder but still short/not harsh
        gain.gain.exponentialRampToValueAtTime(0.065, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        gain.connect(ctx.destination);

        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(760, now);
        osc.frequency.setValueAtTime(640, now + 0.08);
        osc.connect(gain);

        osc.start(now);
        osc.stop(now + 0.2);
        osc.onended = () => ctx.close().catch(() => {});
      };

      // Some browsers create AudioContext in "suspended" state until user gesture.
      if (ctx.state === "suspended") {
        void ctx
          .resume()
          .then(() => startTone())
          .catch(() => {
            pendingAttentionRef.current = true;
            ctx.close().catch(() => {});
          });
      } else {
        startTone();
      }
    } catch {
      // Autoplay blocked in many browsers without a user gesture
      pendingAttentionRef.current = true;
    }
  };

  const tryVibrate = () => {
    try {
      if (typeof navigator === "undefined") return;
      const vib = (navigator as any).vibrate as ((pattern: number | number[]) => boolean) | undefined;
      if (!vib) return;
      // Short, phone-like buzz pattern
      vib([60, 40, 60]);
    } catch {
      // ignore
    }
  };

  const triggerNudge = (reason: "initial" | "repeat") => {
    if (bookingDoneRef.current) return;
    if (readBookingDone()) {
      bookingDoneRef.current = true;
      setUnreadCount(0);
      pendingNudgeRef.current = false;
      setRinging(false);
      return;
    }

    if (open && !minimized) {
      animateBotReply(
        reason === "initial"
          ? "Hey. Tiny reminder.\n\nType **book** and I’ll lock your slot in under a minute."
          : "I’m back.\n\nType **book** and let’s finish your booking (I’ll do the heavy lifting)."
      );
      return;
    }

    pendingNudgeRef.current = true;
    setUnreadCount(1);
    setRinging(true);
    playSoftChirp();
    tryVibrate();
  };

  const scheduleNudge = (delayMs: number, reason: "initial" | "repeat") => {
    clearNudgeTimers();
    if (bookingDoneRef.current) return;
    if (readBookingDone()) {
      bookingDoneRef.current = true;
      return;
    }
    nudgeTimeoutRef.current = window.setTimeout(() => triggerNudge(reason), delayMs);
  };

  // After 10s on page: show unread + ring. If they close: re-nudge after 20s (until booking done).
  useEffect(() => {
    bookingDoneRef.current = readBookingDone();
    if (bookingDoneRef.current) return;
    if (open && !minimized) return;
    scheduleNudge(10000, "initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, minimized, location.pathname]);

  const deliverPendingNudgeIfAny = () => {
    if (!pendingNudgeRef.current && unreadCount === 0) return;
    pendingNudgeRef.current = false;
    setUnreadCount(0);
    setRinging(false);
    pendingAttentionRef.current = false;
    // Wait a tick so viewport refs are ready
    window.setTimeout(() => {
      animateBotReply(
        "I left you a tiny unread message.\n\nType **book** and I’ll do the booking wizard right here — stations, date, time, pricing… the whole thing."
      );
    }, 180);
  };

  const maybeStartBooking = (raw: string) => {
    const t = raw.toLowerCase();
    const intent =
      t.includes("book") ||
      t.includes("reserve") ||
      t.includes("slot") ||
      t.includes("availability") ||
      t.includes("available");
    if (!intent) return false;
    if (booking.active) return false;

    setBooking({ active: true, step: "phone" });
    animateBotReply(
      [
        "Ohhh yes. Booking mode activated.",
        "",
        "Step 1/4: Drop your **10‑digit mobile number** (no spaces).",
        "I’ll pull your details and speed-run the rest.",
      ].join("\n")
    );
    return true;
  };

  const ensureStationsLoaded = async () => {
    if (stationsLoading) return;
    if (stations.length > 0) return;
    setStationsLoading(true);
    setStationsError(null);
    try {
      const data = await fetchStations();
      setStations(data);
    } catch (e: any) {
      setStationsError(e?.message ? String(e.message) : "Failed to load stations.");
    } finally {
      setStationsLoading(false);
    }
  };

  const handleBookingFlow = async (raw: string): Promise<string | null> => {
    if (!booking.active) return null;
    const t = raw.trim();

    // Step: phone
    if (booking.step === "phone") {
      const phone = normalizePhoneNumber(t);
      const v = validateIndianPhoneNumber(phone);
      if (!v.valid) {
        return `Tiny glitch: ${v.error ?? "Invalid phone number."} Try again (example: 9345187098).`;
      }

      let customerName: string | undefined;
      try {
        const customer = await lookupCustomerByPhone(phone);
        customerName = customer?.name;
      } catch {
        // non-fatal: continue
      }

      if (!customerName) {
        setBooking({ active: true, step: "name", phone });
        return [
          "New player spotted. Welcome to the arena.",
          "",
          "Quick one — what should I call you? (Your name)",
        ].join("\n");
      }

      setBooking({ active: true, step: "details", phone, customerName });
      setStationTypeFilter("all");
      setSelectedStationIds([]);
      setSelectedDate(new Date());
      setSlots([]);
      setSelectedSlotTimes([]);
      setSlotHint(null);
      void ensureStationsLoaded();

      if (customerName) {
        return [
          `Welcome back, **${customerName}**. I’m legally obligated to say “nice shot” now.`,
          "",
          "Step 2/4: Pick stations + date + time below. I’ll only show slots that are actually free (no fake hope).",
        ].join("\n");
      }

      return null;
    }

    if (booking.step === "name") {
      const name = t.replace(/\s+/g, " ").trim();
      if (name.length < 2) return "That’s a bit too stealthy. Send your name (at least 2 characters).";

      setBooking({ active: true, step: "details", phone: booking.phone, customerName: name });
      setStationTypeFilter("all");
      setSelectedStationIds([]);
      setSelectedDate(new Date());
      setSlots([]);
      setSelectedSlotTimes([]);
      setSlotHint(null);
      void ensureStationsLoaded();

      return [
        `Perfect, **${name}**. Now let’s get you booked.`,
        "",
        "Step 2/4: Pick stations + date + time below.",
      ].join("\n");
    }

    if (booking.step === "details") {
      return "Use the station tiles + date picker + time slots below. When you’re ready, smash **Continue to booking**.";
    }

    return null;
  };

  const tryPricingReply = async (raw: string): Promise<string | null> => {
    const t = raw.toLowerCase();
    const looksLikePricing =
      t.includes("price") ||
      t.includes("pricing") ||
      t.includes("rate") ||
      t.includes("rates") ||
      t.includes("cost") ||
      t.includes("how much") ||
      t.includes("₹") ||
      t.includes("rupee");
    if (!looksLikePricing) return null;

    const st = stations.length > 0 ? stations : await fetchStations();
    if (stations.length === 0) setStations(st);

    const byType: Record<string, StationLite[]> = { "8ball": [], ps5: [], foosball: [] };
    for (const s of st) byType[s.type]?.push(s);

    const fmtGroup = (label: string, list: StationLite[]) => {
      if (!list.length) return "";
      const lines = list
        .slice(0, 20)
        .map((x) => `- ${x.name}: ₹${x.hourly_rate}/hr`)
        .join("\n");
      return `**${label}**\n${lines}`;
    };

    return [
      "Alright, here are the **current station rates** (live from our system):",
      "",
      fmtGroup("Pool / Snooker (8-ball)", byType["8ball"] || []),
      "",
      fmtGroup("PlayStation 5", byType.ps5 || []),
      "",
      fmtGroup("Foosball", byType.foosball || []),
      "",
      "Want me to lock a slot? Type **book** — I’ll do the fast booking wizard.",
    ]
      .filter(Boolean)
      .join("\n");
  };

  const dateStr = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);

  const filteredStations = useMemo(() => {
    const list = stations;
    if (stationTypeFilter === "all") return list;
    return list.filter((s) => s.type === stationTypeFilter);
  }, [stations, stationTypeFilter]);

  const selectedStations = useMemo(
    () => stations.filter((s) => selectedStationIds.includes(s.id)),
    [stations, selectedStationIds.join(",")]
  );

  const selectedDurationMinutes = selectedSlotTimes.length * 30;
  const selectedDurationHours = selectedSlotTimes.length * 0.5;
  const estimatedTotal = useMemo(() => {
    if (selectedStations.length === 0) return 0;
    if (selectedSlotTimes.length === 0) return 0;
    return selectedStations.reduce((sum, s) => sum + s.hourly_rate * selectedDurationHours, 0);
  }, [selectedStations, selectedSlotTimes.length, selectedDurationHours]);

  useEffect(() => {
    if (!(booking.active && booking.step === "details")) return;
    if (selectedStationIds.length === 0) {
      setSlots([]);
      setSelectedSlotTimes([]);
      setSlotHint(null);
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const data = await getAvailableSlotsUnion(dateStr, selectedStationIds);
        if (cancelled) return;
        setSlots(data);
        if (
          selectedSlotTimes.length > 0 &&
          !selectedSlotTimes.every((t) => data.some((s) => s.start_time === t && s.is_available))
        ) {
          setSelectedSlotTimes([]);
          setSlotHint(null);
        }
      } catch (e: any) {
        if (cancelled) return;
        setSlots([]);
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [booking.active, booking.step, dateStr, selectedStationIds.join(","), selectedSlotTimes.join(",")]);

  const sendUserMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", text: trimmed, ts: Date.now() },
    ]);
    setInput("");
    setStickToBottom(true);
    scrollToBottom("auto");

    // If user intent is booking, start flow immediately without consuming their message
    if (maybeStartBooking(trimmed)) return;

    try {
      const bookingReply = await handleBookingFlow(trimmed);
      if (bookingReply) {
        animateBotReply(bookingReply);
        return;
      }

      const pricingReply = await tryPricingReply(trimmed);
      if (pricingReply) {
        animateBotReply(pricingReply);
        return;
      }

      animateBotReply(
        getGameboyReply(trimmed).text +
          "\n\nIf you want me to **book it for you** inside chat, just type **book**."
      );
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Something went wrong while checking availability.";
      animateBotReply(
        `I hit a snag while checking slots: ${msg}\n\nTry again — or open booking directly: /public/booking`
      );
    }
  };

  const ChatBubble = (
    <button
      type="button"
      onClick={() => {
        setOpen(true);
        setMinimized(false);
        deliverPendingNudgeIfAny();
      }}
      className={`fixed bottom-5 right-5 z-[60] h-14 w-14 rounded-2xl border border-gamehaus-purple/40 bg-gradient-to-br from-black/70 via-gamehaus-purple/25 to-black/70 backdrop-blur-md shadow-2xl shadow-gamehaus-purple/25 hover:shadow-gamehaus-magenta/20 transition-all duration-300 group ${ringing ? "gh-ring" : ""}`}
      aria-label="Open Gameboy chat"
    >
      <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-gamehaus-purple/25 to-gamehaus-magenta/20 blur-xl opacity-60 group-hover:opacity-90 transition-opacity" />
      <div className="relative h-full w-full flex items-center justify-center">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-gamehaus-purple/35 to-gamehaus-magenta/20 border border-white/10 flex items-center justify-center">
          <Gamepad2 className="h-5 w-5 text-white/90" />
        </div>
      </div>
      {unreadCount > 0 && (
        <div className="absolute -top-1.5 -right-1.5">
          <span className="absolute inline-flex h-5 w-5 rounded-full bg-gamehaus-magenta/40 animate-ping" />
          <span className="relative inline-flex h-5 w-5 rounded-full bg-gamehaus-magenta text-white text-[10px] font-bold items-center justify-center border border-white/20 shadow-lg">
            {unreadCount}
          </span>
        </div>
      )}
    </button>
  );

  if (!open) return ChatBubble;

  if (minimized) {
    return (
      <>
        {ChatBubble}
        <div className="fixed bottom-5 right-5 z-[61] pointer-events-none">
          <div className="translate-y-[-68px] mr-0 w-[220px] rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md px-3 py-2 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 text-gamehaus-magenta shrink-0" />
                <span className="text-xs text-gray-200 truncate">Gameboy is ready.</span>
              </div>
              <button
                type="button"
                className="pointer-events-auto text-xs text-gamehaus-lightpurple hover:text-white"
                onClick={() => {
                  setMinimized(false);
                  deliverPendingNudgeIfAny();
                }}
              >
                Open
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      <div
        className="relative overflow-hidden rounded-3xl border border-gamehaus-purple/40 bg-gradient-to-br from-black/75 via-gamehaus-purple/20 to-black/75 backdrop-blur-xl shadow-2xl shadow-black/50 animate-slide-up"
        style={{
          width: `min(${panelWidth}px, ${mobileWidth})`,
          height: `min(${panelHeight}px, calc(100vh - 120px))`,
        }}
      >
        {/* glow */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gamehaus-purple/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gamehaus-magenta/15 blur-3xl" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]" />

        <div className="relative z-10 flex flex-col h-full">
        {/* header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-black/25 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-gamehaus-purple/35 to-gamehaus-magenta/20 border border-white/10 flex items-center justify-center shrink-0">
              <Gamepad2 className="h-5 w-5 text-white/90" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white whitespace-nowrap">Gameboy</p>
                <Badge className="bg-green-500/15 text-green-200 border-green-500/25 text-[10px] px-2 py-0.5">
                  online
                </Badge>
              </div>
              <p className="text-[11px] text-gray-300/80 whitespace-nowrap leading-tight max-w-[240px] truncate">
                Slot‑locker • mildly dramatic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-gray-200 hover:bg-white/10 hover:text-white"
              onClick={() => setMinimized(true)}
              aria-label="Minimize chat"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-gray-200 hover:bg-white/10 hover:text-white"
              onClick={() => {
                setOpen(false);
                setMinimized(false);
                scheduleNudge(20000, "repeat");
              }}
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* content */}
        <div className="relative z-10 flex-1 min-h-0">
          <ScrollArea ref={scrollAreaRootRef} className="h-full">
            <div className="p-4 space-y-3">
              {/* quick tiles */}
              <div className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-semibold text-gray-200">Quick questions</p>
                  <p className="text-[10px] text-gray-400">tap to ask</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickTiles.slice(0, 6).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => sendUserMessage(t.prompt)}
                      className="text-xs px-3 py-1.5 rounded-full border border-gamehaus-purple/30 bg-gradient-to-r from-black/40 to-gamehaus-purple/15 text-gray-100 hover:border-gamehaus-purple/45 hover:bg-black/50 transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-3 border shadow-sm gh-chat-pop ${
                        isUser
                          ? "bg-gradient-to-br from-gamehaus-magenta/25 to-gamehaus-purple/20 border-gamehaus-magenta/30 text-white"
                          : "bg-black/35 border-white/10 text-gray-100"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {m.text}
                      </div>
                      <div className={`mt-2 text-[10px] ${isUser ? "text-gray-200/70" : "text-gray-400"}`}>
                        {formatTime(m.ts)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[86%] rounded-2xl px-4 py-3 border border-white/10 bg-black/35 text-gray-100">
                    <div className="flex items-center gap-2">
                      <TypingDots />
                      <span className="text-xs text-gray-300">Gameboy is typing…</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Booking flow UI (mirrors /public/booking) */}
              {booking.active && booking.step === "details" && (
                <div className="rounded-3xl border border-white/10 bg-black/25 backdrop-blur-sm p-3">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="h-4 w-4 text-gamehaus-magenta shrink-0" />
                      <p className="text-xs font-semibold text-gray-200 truncate">
                        Booking assistant • pick stations + date + time
                      </p>
                    </div>
                    <Badge className="bg-white/10 text-gray-200 border-white/10 text-[10px] px-2 py-0.5">
                      {selectedStationIds.length} selected
                    </Badge>
                  </div>

                  {/* Station type filter (like booking page) */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {([
                      { k: "all", label: "All" },
                      { k: "8ball", label: "Pool / Snooker" },
                      { k: "ps5", label: "PS5" },
                      { k: "foosball", label: "Foosball" },
                    ] as const).map((t) => {
                      const active = stationTypeFilter === t.k;
                      return (
                        <button
                          key={t.k}
                          type="button"
                          onClick={() => setStationTypeFilter(t.k)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            active
                              ? "border-gamehaus-magenta/45 bg-gamehaus-magenta/20 text-white"
                              : "border-gamehaus-purple/25 bg-black/30 text-gray-100 hover:border-gamehaus-purple/40"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Station tiles (multi-select) */}
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-semibold text-gray-200">Select stations (multi)</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-[10px] text-gamehaus-lightpurple hover:text-white"
                          onClick={() => {
                            const shownIds = filteredStations.map((s) => s.id);
                            setSelectedStationIds((prev) => Array.from(new Set([...prev, ...shownIds])));
                          }}
                          disabled={stationsLoading || filteredStations.length === 0}
                        >
                          Select all shown
                        </button>
                        <span className="text-[10px] text-gray-600">•</span>
                        <button
                          type="button"
                          className="text-[10px] text-gray-300 hover:text-white"
                          onClick={() => setSelectedStationIds([])}
                          disabled={selectedStationIds.length === 0}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {stationsLoading ? (
                      <div className="text-xs text-gray-400">Loading stations…</div>
                    ) : stationsError ? (
                      <div className="text-xs text-red-300">
                        {stationsError}{" "}
                        <button type="button" className="underline" onClick={() => void ensureStationsLoaded()}>
                          Retry
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-[170px] overflow-auto pr-1">
                        {filteredStations.map((s) => {
                          const selected = selectedStationIds.includes(s.id);
                          const Icon = s.type === "ps5" ? Gamepad2 : s.type === "8ball" ? Timer : Table2;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedSlotTimes([]);
                                setSlotHint(null);
                                setSelectedStationIds((prev) =>
                                  prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                                );
                              }}
                              className={`text-left rounded-2xl border p-2 transition-colors ${
                                selected
                                  ? "border-gamehaus-magenta/45 bg-gamehaus-magenta/15"
                                  : "border-white/10 bg-black/25 hover:border-gamehaus-purple/35"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className="h-8 w-8 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center shrink-0">
                                  <Icon className="h-4 w-4 text-white/85" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-white truncate">{s.name}</p>
                                  <p className="text-[10px] text-gray-400 truncate">₹{s.hourly_rate}/hr</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Step 2 is station-first: unlock date/time only after stations are selected */}
                  {selectedStationIds.length === 0 ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-gray-300">
                      Select stations to unlock the date & time picker.
                    </div>
                  ) : (
                    <>
                      {/* Date picker */}
                      <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-gamehaus-lightpurple" />
                            <p className="text-xs font-semibold text-gray-200">Pick date</p>
                          </div>
                          <Badge className="bg-white/10 text-gray-200 border-white/10 text-[10px] px-2 py-0.5">
                            {dateStr}
                          </Badge>
                        </div>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(d) => {
                            if (!d) return;
                            setSelectedSlotTimes([]);
                            setSlotHint(null);
                            setSelectedDate(d);
                          }}
                          disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                          className="rounded-xl border border-white/10 bg-black/10"
                        />
                      </div>

                      {/* Time slot picker */}
                      <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gamehaus-lightpurple" />
                            <p className="text-xs font-semibold text-gray-200">Pick time</p>
                          </div>
                          <p className="text-[10px] text-gray-400">
                            {slotsLoading ? "Checking slots…" : `${slots.filter((s) => s.is_available).length} open`}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 max-h-[160px] overflow-auto pr-1">
                          {slots.map((s) => {
                            const isSelected = selectedSlotTimes.includes(s.start_time);
                            const disabled = !s.is_available || s.status === "elapsed";
                            return (
                              <button
                                key={s.start_time}
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  setSlotHint(null);
                                  const idx = slots.findIndex((x) => x.start_time === s.start_time);
                                  if (idx < 0) return;
                                  const available = slots[idx]?.is_available && slots[idx]?.status !== "elapsed";
                                  if (!available) return;

                                  if (selectedSlotTimes.length === 0) {
                                    setSelectedSlotTimes([s.start_time]);
                                    return;
                                  }

                                  const anchor = selectedSlotTimes[0]!;
                                  const aIdx = slots.findIndex((x) => x.start_time === anchor);
                                  if (aIdx < 0) {
                                    setSelectedSlotTimes([s.start_time]);
                                    return;
                                  }

                                  const lo = Math.min(aIdx, idx);
                                  const hi = Math.max(aIdx, idx);
                                  const range = slots.slice(lo, hi + 1);
                                  const ok = range.every((x) => x.is_available && x.status !== "elapsed");
                                  if (!ok) {
                                    setSlotHint("Pick a continuous range of available slots (no gaps).");
                                    return;
                                  }
                                  setSelectedSlotTimes(range.map((x) => x.start_time));
                                }}
                                className={`text-[11px] px-2 py-2 rounded-xl border transition-colors ${
                                  disabled
                                    ? "border-white/5 bg-black/20 text-gray-600 cursor-not-allowed"
                                    : isSelected
                                      ? "border-gamehaus-magenta/55 bg-gamehaus-magenta/20 text-white"
                                      : "border-white/10 bg-black/25 text-gray-100 hover:border-gamehaus-purple/35"
                                }`}
                                title={disabled ? "Not available" : "Select"}
                              >
                                {formatSlotLabel(s.start_time)}
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-2 space-y-1">
                          <p className="text-[10px] text-gray-400">
                            Tip: pick a start time, then click an end time to select multiple slots.
                          </p>
                          {slotHint && <p className="text-[10px] text-red-300">{slotHint}</p>}

                          {selectedSlotTimes.length > 0 && (
                            <div className="mt-2 rounded-xl border border-white/10 bg-black/25 p-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-[11px] text-gray-200">
                                  <span className="font-semibold text-white">Selected:</span>{" "}
                                  {formatSlotLabel(selectedSlotTimes[0]!)}{" "}
                                  {selectedSlotTimes.length > 1 ? `→ ${formatSlotLabel(selectedSlotTimes[selectedSlotTimes.length - 1]!)}` : ""}
                                </div>
                                <Badge className="bg-white/10 text-gray-200 border-white/10 text-[10px] px-2 py-0.5">
                                  {selectedDurationMinutes} min
                                </Badge>
                              </div>
                              {selectedStations.length > 0 && (
                                <div className="mt-2 text-[11px] text-gray-200">
                                  <span className="text-gray-400">Estimate:</span>{" "}
                                  <span className="font-semibold text-white">₹{Math.round(estimatedTotal)}</span>{" "}
                                  <span className="text-gray-400">
                                    ({selectedStations.length} station{selectedStations.length > 1 ? "s" : ""} × {selectedDurationMinutes} min)
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      className="bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta hover:from-gamehaus-purple hover:to-gamehaus-magenta shadow-lg shadow-gamehaus-purple/25"
                      disabled={selectedStationIds.length === 0 || selectedSlotTimes.length === 0}
                      onClick={() => {
                        const startTime = selectedSlotTimes[0];
                        if (!startTime) return;
                        const url = buildPublicBookingUrl({
                          phone: booking.phone,
                          customerName: booking.customerName,
                          stationIds: selectedStationIds,
                          dateStr,
                          startTime,
                          span: selectedSlotTimes.length,
                        });
                        navigate(url);
                      }}
                    >
                      Continue to booking
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/10 bg-black/20 text-gray-200 hover:bg-white/10"
                      onClick={() => {
                        setBooking({ active: false });
                        animateBotReply("Booking flow paused. If you want it again, type **book**.");
                      }}
                    >
                      Stop
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* input */}
        <div className="border-t border-white/10 bg-black/25 px-3 py-3 shrink-0">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void sendUserMessage(input);
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={booking.active ? "Reply to Gameboy’s question…" : "Ask me about booking, pricing, availability…"}
              className="bg-black/30 border-white/10 text-white placeholder:text-gray-400 focus-visible:ring-gamehaus-purple/40"
              maxLength={500}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta hover:from-gamehaus-purple hover:to-gamehaus-magenta shadow-lg shadow-gamehaus-purple/30"
              aria-label="Send message"
              disabled={isTyping}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-2 text-[10px] text-gray-400 px-1 leading-tight">
            Be nice. Gameboy gets extra helpful. Be chaotic and he’ll still help… just with judgement.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}

