import * as React from "react";

import { Calendar, Gamepad2, Radio, ShieldCheck, Sparkles, Table2, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Reveal from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { PUBLIC_BOOKING_URL } from "@/config/brand";

type Card = {
  title: string;
  description: string;
  bullets: string[];
  Icon: React.ComponentType<{ className?: string }>;
  tint: "purple" | "magenta";
};

const cards: Card[] = [
  {
    title: "Pro‑grade tables",
    description: "Consistent conditions, clean rails, and tournament-ready setup—built for serious frames.",
    bullets: ["Smooth cloth & calibrated lighting", "Comfort-first seating", "Predictable session flow"],
    Icon: Trophy,
    tint: "purple",
  },
  {
    title: "Console & co‑op zones",
    description: "Next‑gen sessions tuned for comfort and focus—jump in fast, stay locked in.",
    bullets: ["Low-distraction ambience", "High comfort setup", "Perfect for squads & duos"],
    Icon: Gamepad2,
    tint: "magenta",
  },
  {
    title: "Events that hit",
    description: "Community nights, tournaments, and special sessions—run with real-time status and clean scheduling.",
    bullets: ["Live availability board", "Tournaments & leaderboards", "Fast booking & confirmations"],
    Icon: Radio,
    tint: "purple",
  },
];

export default function ExperienceShowcase() {
  const navigate = useNavigate();

  return (
    <section className="w-full max-w-6xl mx-auto px-4">
      <Reveal>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div className="max-w-3xl">
            <p className="text-xs tracking-[0.25em] text-gray-400">THE VIBE</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-white tracking-tight">
              A high‑tech lounge feel, with{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-lightpurple via-gamehaus-magenta to-gamehaus-purple animate-text-gradient">
                butter‑smooth flow
              </span>
            </h2>
            <p className="mt-4 text-gray-300 leading-relaxed">
              Built like a modern arena and run like a professional club—clean visuals, clean timing, clean play.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="text-gamehaus-lightpurple border-gamehaus-purple/60 hover:bg-gamehaus-purple/30 hover:border-gamehaus-lightpurple/80 transition-all duration-300"
              onClick={() => navigate("/public/stations")}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Live availability
            </Button>
            <Button
              className="bg-gradient-to-r from-gamehaus-purple via-gamehaus-magenta to-gamehaus-purple text-white shadow-lg shadow-gamehaus-purple/40 transition-all duration-300 hover:shadow-xl hover:shadow-gamehaus-purple/50"
              onClick={() => window.open(PUBLIC_BOOKING_URL, "_blank")}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Book a slot
            </Button>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((c, idx) => (
          <Reveal key={c.title} delayMs={idx * 80}>
            <div
              className={[
                "group relative overflow-hidden rounded-3xl border bg-gradient-to-br from-black/70 to-black/40 backdrop-blur-md p-6",
                "transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl",
                c.tint === "magenta"
                  ? "border-gamehaus-magenta/35 hover:border-gamehaus-magenta/55 hover:shadow-gamehaus-magenta/25"
                  : "border-gamehaus-purple/35 hover:border-gamehaus-purple/55 hover:shadow-gamehaus-purple/25",
              ].join(" ")}
            >
              <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]" />
              <div className="absolute inset-0 bg-noise-soft opacity-[0.10] mix-blend-overlay" />
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full blur-[70px] opacity-35 bg-gradient-to-br from-gamehaus-purple/25 to-transparent" />
                <div className="absolute -right-24 -bottom-24 h-64 w-64 rounded-full blur-[70px] opacity-35 bg-gradient-to-tr from-gamehaus-magenta/25 to-transparent" />
              </div>

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={[
                      "h-12 w-12 rounded-2xl border flex items-center justify-center",
                      c.tint === "magenta"
                        ? "border-gamehaus-magenta/35 bg-gamehaus-magenta/10"
                        : "border-gamehaus-purple/35 bg-gamehaus-purple/10",
                    ].join(" ")}
                  >
                    <c.Icon className="h-6 w-6 text-gamehaus-lightpurple" />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Sparkles className="h-4 w-4 text-gamehaus-pink" />
                    <span className="tracking-wide">premium</span>
                  </div>
                </div>

                <h3 className="mt-6 text-xl font-bold text-white">{c.title}</h3>
                <p className="mt-3 text-sm text-gray-300 leading-relaxed">{c.description}</p>

                <ul className="mt-5 space-y-2 text-sm text-gray-300">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gamehaus-pink/80 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex items-center gap-3 text-xs text-gray-400">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1">
                    <Table2 className="h-3.5 w-3.5 text-gamehaus-lightpurple" />
                    Foosball table
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1">
                    <Radio className="h-3.5 w-3.5 text-gamehaus-lightpurple" />
                    Live status
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

