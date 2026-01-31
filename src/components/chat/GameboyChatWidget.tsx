import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Minus, Send, Sparkles, Gamepad2 } from "lucide-react";
import { getGameboyReply } from "@/components/chat/gameboyBrain";
import { QUICK_TILES } from "@/components/chat/gameboyKnowledge";

type Role = "user" | "bot";

type ChatMessage = {
  id: string;
  role: Role;
  text: string;
  ts: number;
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
  }, [location.pathname]);

  if (!shouldRender) return null;

  const sendUserMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", text: trimmed, ts: Date.now() },
    ]);
    setInput("");

    setIsTyping(true);
    const delay = clamp(520 + trimmed.length * 14, 650, 1400);

    window.setTimeout(() => {
      const reply = getGameboyReply(trimmed);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "bot", text: reply.text, ts: Date.now() },
      ]);
      setIsTyping(false);
    }, delay);
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
              placeholder="Ask me about booking, pricing, availability…"
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

