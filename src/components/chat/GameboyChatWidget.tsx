import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Minus, Send, Sparkles, Gamepad2, Calendar, Clock, ArrowRight } from "lucide-react";
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
  toDateString,
  toSlotTimeString,
  validateIndianPhoneNumber,
} from "@/components/chat/bookingActions";

type Role = "user" | "bot";

type ChatMessage = {
  id: string;
  role: Role;
  text: string;
  ts: number;
};

type BookingFlow =
  | { active: false }
  | { active: true; step: "phone" }
  | { active: true; step: "stationType"; phone: string; customerName?: string }
  | { active: true; step: "date"; phone: string; customerName?: string; stationType: StationType | "all" }
  | { active: true; step: "time"; phone: string; customerName?: string; stationType: StationType | "all"; dateStr: string }
  | {
      active: true;
      step: "slot";
      phone?: string;
      customerName?: string;
      stationType: StationType | "all";
      dateStr: string;
      slots: Array<{ start_time: string; end_time: string; is_available: boolean; status?: string }>;
      selectedStartTime?: string;
    };

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

function useAutoScroll(deps: unknown[]) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
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
    if (p.startsWith("/public")) return true;
    return false;
  }, [location.pathname, user]);

  const quickTiles = useMemo(() => QUICK_TILES, []);

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [booking, setBooking] = useState<BookingFlow>({ active: false });
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

  const panelWidth = 380;
  const panelHeight = 560;
  const mobileWidth = "calc(100vw - 24px)";

  const scrollRef = useAutoScroll([messages.length, isTyping]);

  useEffect(() => {
    // If route changes, keep it closed to reduce distraction
    setOpen(false);
    setMinimized(false);
    setIsTyping(false);
    setBooking({ active: false });
  }, [location.pathname]);

  if (!shouldRender) return null;

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
    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: "bot",
        ts: Date.now(),
        text: [
          "Perfect. Let’s lock your slot in under a minute.",
          "",
          "Step 1/4: Send your **10‑digit mobile number** (no spaces).",
        ].join("\n"),
      },
    ]);
    return true;
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

      setBooking({ active: true, step: "stationType", phone, customerName });

      if (customerName) {
        return [
          `Welcome back, **${customerName}**. Gameboy remembers champions.`,
          "",
          "Step 2/4: What are we booking?",
        ].join("\n");
      }

      return [
        "Nice — fresh entry unlocked.",
        "",
        "Step 2/4: What are we booking?",
      ].join("\n");
    }

    // Step: station type
    if (booking.step === "stationType") {
      const lowered = t.toLowerCase();
      let stationType: StationType | "all" = "all";
      if (lowered.includes("ps5") || lowered.includes("playstation") || lowered.includes("console")) stationType = "ps5";
      else if (lowered.includes("foos")) stationType = "foosball";
      else if (lowered.includes("pool") || lowered.includes("8ball") || lowered.includes("snooker")) stationType = "8ball";
      else if (lowered.includes("any") || lowered.includes("all")) stationType = "all";

      setBooking({ active: true, step: "date", phone: booking.phone, customerName: booking.customerName, stationType });
      return [
        `Locked: **${stationType === "all" ? "Any station" : stationType.toUpperCase()}**.`,
        "",
        "Step 3/4: Which date?",
        "- Type `today`, `tomorrow`, `YYYY-MM-DD`, or `DD/MM/YYYY`",
      ].join("\n");
    }

    // Step: date
    if (booking.step === "date") {
      const dateStr = toDateString(t);
      if (!dateStr) {
        return "Date format didn’t compute. Try `today`, `tomorrow`, `2026-02-01`, or `01/02/2026`.";
      }
      setBooking({
        active: true,
        step: "time",
        phone: booking.phone,
        customerName: booking.customerName,
        stationType: booking.stationType,
        dateStr,
      });
      return [
        `Great — **${dateStr}**.`,
        "",
        "Step 4/4: What start time?",
        "- Type `18:00` (24h) or `6pm` / `6:30pm`",
      ].join("\n");
    }

    // Step: time -> fetch slots, check
    if (booking.step === "time") {
      const startTime = toSlotTimeString(t);
      if (!startTime) {
        return "Time format didn’t compute. Try `18:00` or `6pm` / `6:30pm`.";
      }

      // load stations + slots
      const allStations = await fetchStations();
      const stationIds =
        booking.stationType === "all"
          ? allStations.map((s) => s.id)
          : allStations.filter((s) => s.type === booking.stationType).map((s) => s.id);

      const slots = await getAvailableSlotsUnion(booking.dateStr, stationIds);
      const match = slots.find((s) => s.start_time === startTime);
      const available = Boolean(match?.is_available);

      setBooking({
        active: true,
        step: "slot",
        phone: booking.phone,
        customerName: booking.customerName,
        stationType: booking.stationType,
        dateStr: booking.dateStr,
        slots,
        selectedStartTime: startTime,
      });

      const availableOnly = slots.filter((s) => s.is_available);
      const preview = availableOnly.slice(0, 10).map((s) => `- ${formatSlotLabel(s.start_time)}`).join("\n");

      if (available) {
        return [
          `✅ **${formatSlotLabel(startTime)}** on **${booking.dateStr}** looks **available**.`,
          "",
          "Here are some other open starts too:",
          preview || "- (none)",
          "",
          "Tap **Continue to booking** below and I’ll prefill everything for you.",
        ].join("\n");
      }

      return [
        `❌ **${formatSlotLabel(startTime)}** on **${booking.dateStr}** is **not available** right now.`,
        "",
        "Here are the closest options I can see:",
        preview || "- (none)",
        "",
        "Pick a slot chip below and I’ll take you to booking with it prefilled.",
      ].join("\n");
    }

    // Step: slot selection
    if (booking.step === "slot") {
      const startTime = toSlotTimeString(t);
      if (!startTime) {
        return "Pick a slot chip below, or type a time like `18:30`.";
      }
      const match = booking.slots.find((s) => s.start_time === startTime);
      if (!match?.is_available) {
        return `That one isn’t free. Try another (example: ${booking.slots.find((s) => s.is_available)?.start_time?.slice(0, 5) ?? "18:30"}).`;
      }
      setBooking({ ...booking, selectedStartTime: startTime });
      return `Perfect — **${formatSlotLabel(startTime)}** selected. Hit **Continue to booking** and I’ll prefill it.`;
    }

    return null;
  };

  const tryDirectAvailabilityQuestion = async (raw: string): Promise<string | null> => {
    const t = raw.trim();
    const lowered = t.toLowerCase();
    const looksLikeAvailability =
      lowered.includes("available") ||
      lowered.includes("availability") ||
      lowered.includes("slot") ||
      lowered.includes("free");
    if (!looksLikeAvailability) return null;

    // Station type hint
    let stationType: StationType | "all" = "all";
    if (lowered.includes("ps5") || lowered.includes("playstation") || lowered.includes("console")) stationType = "ps5";
    else if (lowered.includes("foos")) stationType = "foosball";
    else if (lowered.includes("pool") || lowered.includes("8ball") || lowered.includes("snooker")) stationType = "8ball";

    // Date hint
    const dateStr =
      lowered.includes("tomorrow") ? toDateString("tomorrow") :
      lowered.includes("today") ? toDateString("today") :
      (() => {
        const iso = lowered.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
        if (iso) return toDateString(iso);
        const dmy = lowered.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/)?.[0];
        if (dmy) return toDateString(dmy);
        return null;
      })();

    // Time hint
    const timeMatch =
      lowered.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/)?.[0] ??
      lowered.match(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/)?.[0];
    const startTime = timeMatch ? toSlotTimeString(timeMatch) : null;

    if (!dateStr || !startTime) return null;

    const allStations = await fetchStations();
    const stationIds =
      stationType === "all"
        ? allStations.map((s) => s.id)
        : allStations.filter((s) => s.type === stationType).map((s) => s.id);

    const slots = await getAvailableSlotsUnion(dateStr, stationIds);
    const match = slots.find((s) => s.start_time === startTime);
    const ok = Boolean(match?.is_available);

    if (ok) {
      setBooking({
        active: true,
        step: "slot",
        phone: undefined,
        stationType,
        dateStr,
        slots,
        selectedStartTime: startTime,
      });
      return [
        `✅ **${formatSlotLabel(startTime)}** on **${dateStr}** looks **available**.`,
        "",
        "Want me to take you to booking with this prefilled? Type **book** and I’ll do the full flow (fastest).",
      ].join("\n");
    }

    const next = slots.find((s) => s.is_available);
    return [
      `❌ **${formatSlotLabel(startTime)}** on **${dateStr}** is **not available** right now.`,
      next ? `Closest available start I can see: **${formatSlotLabel(next.start_time)}**.` : "I’m not seeing open slots for that day in this category.",
      "",
      "If you type **book**, I’ll guide you to the fastest available slot and prefill the booking page.",
    ].join("\n");
  };

  const sendUserMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", text: trimmed, ts: Date.now() },
    ]);
    setInput("");

    // If user intent is booking, start flow immediately without consuming their message
    if (maybeStartBooking(trimmed)) return;

    setIsTyping(true);
    const minDelay = clamp(520 + trimmed.length * 12, 650, 1300);
    const startedAt = Date.now();

    try {
      const direct = await tryDirectAvailabilityQuestion(trimmed);
      if (direct) {
        const remaining = Math.max(0, minDelay - (Date.now() - startedAt));
        window.setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { id: uid(), role: "bot", text: direct, ts: Date.now() },
          ]);
          setIsTyping(false);
        }, remaining);
        return;
      }

      const bookingReply = await handleBookingFlow(trimmed);
      const replyText = bookingReply ?? getGameboyReply(trimmed).text + "\n\nWant me to **set up a booking** for you? Type **book**.";

      const remaining = Math.max(0, minDelay - (Date.now() - startedAt));
      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "bot", text: replyText, ts: Date.now() },
        ]);
        setIsTyping(false);
      }, remaining);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Something went wrong while checking availability.";
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "bot",
          ts: Date.now(),
          text: `I hit a snag while checking slots: ${msg}\n\nTry again, or open booking directly: /public/booking`,
        },
      ]);
      setIsTyping(false);
    }
  };

  const ChatBubble = (
    <button
      type="button"
      onClick={() => {
        setOpen(true);
        setMinimized(false);
      }}
      className="fixed bottom-5 right-5 z-[60] h-14 w-14 rounded-2xl border border-gamehaus-purple/40 bg-gradient-to-br from-black/70 via-gamehaus-purple/25 to-black/70 backdrop-blur-md shadow-2xl shadow-gamehaus-purple/25 hover:shadow-gamehaus-magenta/20 transition-all duration-300 group"
      aria-label="Open Gameboy chat"
    >
      <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-gamehaus-purple/25 to-gamehaus-magenta/20 blur-xl opacity-60 group-hover:opacity-90 transition-opacity" />
      <div className="relative h-full w-full flex items-center justify-center">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-gamehaus-purple/35 to-gamehaus-magenta/20 border border-white/10 flex items-center justify-center">
          <Gamepad2 className="h-5 w-5 text-white/90" />
        </div>
      </div>
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
                onClick={() => setMinimized(false)}
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
        className="relative overflow-hidden rounded-3xl border border-gamehaus-purple/40 bg-gradient-to-br from-black/75 via-gamehaus-purple/20 to-black/75 backdrop-blur-xl shadow-2xl shadow-black/50"
        style={{
          width: `min(${panelWidth}px, ${mobileWidth})`,
          height: `min(${panelHeight}px, calc(100vh - 120px))`,
        }}
      >
        {/* glow */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gamehaus-purple/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gamehaus-magenta/15 blur-3xl" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]" />

        {/* header */}
        <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-black/25">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-gamehaus-purple/35 to-gamehaus-magenta/20 border border-white/10 flex items-center justify-center shrink-0">
              <Gamepad2 className="h-5 w-5 text-white/90" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white truncate">Gameboy</p>
                <Badge className="bg-green-500/15 text-green-200 border-green-500/25 text-[10px] px-2 py-0.5">
                  online
                </Badge>
              </div>
              <p className="text-xs text-gray-300/80 truncate">
                Quirky concierge • fast replies • zero judgement
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
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* content */}
        <div className="relative z-10 h-[calc(100%-56px-78px)]">
          <ScrollArea className="h-full">
            <div ref={scrollRef} className="p-4 space-y-3">
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
                      className={`max-w-[86%] rounded-2xl px-4 py-3 border shadow-sm ${
                        isUser
                          ? "bg-gradient-to-br from-gamehaus-magenta/25 to-gamehaus-purple/20 border-gamehaus-magenta/30 text-white"
                          : "bg-black/35 border-white/10 text-gray-100"
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
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

              {/* Booking flow helpers */}
              {booking.active && booking.step === "stationType" && (
                <div className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-gamehaus-magenta" />
                    <p className="text-xs font-semibold text-gray-200">Pick a category</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { k: "ps5", label: "PS5" },
                      { k: "8ball", label: "Pool / Snooker" },
                      { k: "foosball", label: "Foosball" },
                      { k: "all", label: "Any" },
                    ].map((t) => (
                      <button
                        key={t.k}
                        type="button"
                        onClick={() => sendUserMessage(t.label)}
                        className="text-xs px-3 py-1.5 rounded-full border border-gamehaus-purple/30 bg-gradient-to-r from-black/40 to-gamehaus-purple/15 text-gray-100 hover:border-gamehaus-purple/45 hover:bg-black/50 transition-colors"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {booking.active && booking.step === "slot" && (
                <div className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gamehaus-lightpurple" />
                      <p className="text-xs font-semibold text-gray-200">Available starts</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{booking.dateStr}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-[132px] overflow-auto pr-1">
                    {booking.slots
                      .filter((s) => s.is_available)
                      .map((s) => {
                        const selected = booking.selectedStartTime === s.start_time;
                        return (
                          <button
                            key={s.start_time}
                            type="button"
                            onClick={() => sendUserMessage(s.start_time)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              selected
                                ? "border-gamehaus-magenta/50 bg-gamehaus-magenta/20 text-white"
                                : "border-white/10 bg-black/30 text-gray-100 hover:border-gamehaus-purple/35"
                            }`}
                          >
                            {formatSlotLabel(s.start_time)}
                          </button>
                        );
                      })}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      className="bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta hover:from-gamehaus-purple hover:to-gamehaus-magenta shadow-lg shadow-gamehaus-purple/25"
                      onClick={() => {
                        if (!booking.selectedStartTime) return;
                        if (!booking.phone) {
                          setBooking({ active: true, step: "phone" });
                          setMessages((prev) => [
                            ...prev,
                            { id: uid(), role: "bot", ts: Date.now(), text: "Before I can prefill booking, I need your **10‑digit mobile number**." },
                          ]);
                          return;
                        }
                        const url = buildPublicBookingUrl({
                          phone: booking.phone,
                          stationType: booking.stationType,
                          dateStr: booking.dateStr,
                          startTime: booking.selectedStartTime,
                        });
                        navigate(url);
                      }}
                      disabled={!booking.selectedStartTime}
                    >
                      Continue to booking
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/10 bg-black/20 text-gray-200 hover:bg-white/10"
                      onClick={() => {
                        setBooking({ active: true, step: "date", phone: booking.phone, customerName: booking.customerName, stationType: booking.stationType });
                        setMessages((prev) => [
                          ...prev,
                          { id: uid(), role: "bot", ts: Date.now(), text: "Want a different date? Type `today`, `tomorrow`, `YYYY-MM-DD`, or `DD/MM/YYYY`." },
                        ]);
                      }}
                    >
                      Change date
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/10 bg-black/20 text-gray-200 hover:bg-white/10"
                      onClick={() => {
                        setBooking({ active: false });
                        setMessages((prev) => [
                          ...prev,
                          { id: uid(), role: "bot", ts: Date.now(), text: "Booking flow paused. If you want it again, type **book**." },
                        ]);
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
        <div className="relative z-10 border-t border-white/10 bg-black/25 px-3 py-3">
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
          <p className="mt-2 text-[10px] text-gray-400 px-1">
            Be nice. Gameboy gets extra helpful.
          </p>
        </div>
      </div>
    </div>
  );
}

