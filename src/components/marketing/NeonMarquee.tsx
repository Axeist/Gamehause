import * as React from "react";

import { Gamepad2, Headset, ShieldCheck, Sparkles, Timer, Trophy } from "lucide-react";

const items = [
  { label: "Tournament-grade tables", Icon: Trophy },
  { label: "Next‑gen console sessions", Icon: Gamepad2 },
  { label: "Low‑friction booking flow", Icon: ShieldCheck },
  { label: "Immersive VR vibes", Icon: Headset },
  { label: "On‑time session handling", Icon: Timer },
  { label: "Premium lounge atmosphere", Icon: Sparkles },
];

export default function NeonMarquee() {
  // Duplicate for seamless loop
  const loop = [...items, ...items];

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <div className="relative overflow-hidden rounded-2xl border border-gamehaus-purple/25 bg-black/35 backdrop-blur-sm">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]" />
        <div className="absolute inset-0 bg-noise-soft opacity-[0.10] mix-blend-overlay" />
        <div className="relative py-4">
          <div className="gamehaus-marquee">
            <div className="gamehaus-marquee-track">
              {loop.map(({ label, Icon }, idx) => (
                <span
                  key={`${label}-${idx}`}
                  className="inline-flex items-center gap-2 mx-6 text-sm text-gray-200/90"
                >
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-gamehaus-purple/25 bg-black/50">
                    <Icon className="h-4 w-4 text-gamehaus-lightpurple" />
                  </span>
                  <span className="whitespace-nowrap">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
                      {label}
                    </span>
                  </span>
                  <span className="mx-2 h-1 w-1 rounded-full bg-gamehaus-magenta/40" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

