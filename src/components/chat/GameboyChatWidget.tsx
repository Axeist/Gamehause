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
};

type BookingFlow =
  | { active: false }
  | { active: true; step: "phone" }
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

  // Booking UI state (matches PublicBooking flow: type filter -> station select -> date -> time slot)
  const [stationTypeFilter, setStationTypeFilter] = useState<StationType | "all">("all");
  const [stations, setStations] = useState<StationLite[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
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
    setStations([]);
    setStationsLoading(false);
    setStationsError(null);
    setSelectedStationIds([]);
    setStationTypeFilter("all");
    setSelectedDate(new Date());
    setSlots([]);
    setSlotsLoading(false);
    setSelectedStartTime(null);
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

      setBooking({ active: true, step: "details", phone, customerName });
      setStationTypeFilter("all");
      setSelectedStationIds([]);
      setSelectedDate(new Date());
      setSlots([]);
      setSelectedStartTime(null);
      void ensureStationsLoaded();

      if (customerName) {
        return [
          `Welcome back, **${customerName}**. Gameboy remembers champions.`,
          "",
          "Step 2/4: Pick stations + date + time below. I’ll only show slots that are actually free.",
        ].join("\n");
      }

      return [
        "Nice — fresh entry unlocked.",
        "",
        "Step 2/4: Pick stations + date + time below. I’ll only show slots that are actually free.",
      ].join("\n");
    }

    if (booking.step === "details") {
      return "Use the station tiles + date picker + time slots below. When you’re ready, hit **Continue to booking**.";
    }

    return null;
  };

  const dateStr = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);

  const filteredStations = useMemo(() => {
    const list = stations;
    if (stationTypeFilter === "all") return list;
    return list.filter((s) => s.type === stationTypeFilter);
  }, [stations, stationTypeFilter]);

  useEffect(() => {
    if (!(booking.active && booking.step === "details")) return;
    if (selectedStationIds.length === 0) {
      setSlots([]);
      setSelectedStartTime(null);
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const data = await getAvailableSlotsUnion(dateStr, selectedStationIds);
        if (cancelled) return;
        setSlots(data);
        if (selectedStartTime && !data.some((s) => s.start_time === selectedStartTime && s.is_available)) {
          setSelectedStartTime(null);
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
  }, [booking.active, booking.step, dateStr, selectedStationIds.join(","), selectedStartTime]);

  const tryDirectAvailabilityQuestion = async (_raw: string): Promise<string | null> => {
    return null;
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
                                setSelectedStartTime(null);
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
                        setSelectedStartTime(null);
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
                        {selectedStationIds.length === 0 ? "Select stations first" : slotsLoading ? "Checking slots…" : `${slots.filter((s) => s.is_available).length} open`}
                      </p>
                    </div>

                    {selectedStationIds.length === 0 ? (
                      <p className="text-xs text-gray-400">Select one or more stations to load available time slots.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-[160px] overflow-auto pr-1">
                        {slots.map((s) => {
                          const isSelected = selectedStartTime === s.start_time;
                          const disabled = !s.is_available || s.status === "elapsed";
                          return (
                            <button
                              key={s.start_time}
                              type="button"
                              disabled={disabled}
                              onClick={() => setSelectedStartTime(s.start_time)}
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
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      className="bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta hover:from-gamehaus-purple hover:to-gamehaus-magenta shadow-lg shadow-gamehaus-purple/25"
                      disabled={selectedStationIds.length === 0 || !selectedStartTime}
                      onClick={() => {
                        const url = buildPublicBookingUrl({
                          phone: booking.phone,
                          stationIds: selectedStationIds,
                          dateStr,
                          startTime: selectedStartTime ?? undefined,
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

