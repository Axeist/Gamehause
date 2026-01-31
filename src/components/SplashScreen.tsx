import React, { useEffect, useMemo, useState } from "react";
import { LOGO_PATH, BRAND_NAME } from "@/config/brand";

type Props = {
  variant: "first_visit" | "login_success";
  onDone: () => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function SplashScreen({ variant, onDone }: Props) {
  const [progress, setProgress] = useState(0);

  const headline = useMemo(() => {
    if (variant === "login_success") return "Access granted.";
    return "Welcome to the arena.";
  }, [variant]);

  const subline = useMemo(() => {
    if (variant === "login_success") return "Booting control systems • syncing dashboards";
    return "Neon nights • clean tables • smooth booking";
  }, [variant]);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = variant === "login_success" ? 1450 : 1650;

    const tick = (t: number) => {
      const p = clamp((t - start) / duration, 0, 1);
      // Ease-out
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased);
      if (p >= 1) {
        onDone();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone, variant]);

  return (
    <div
      className="fixed inset-0 z-[999] overflow-hidden bg-gradient-to-br from-[#050507] via-[#120816] to-[#050507]"
      role="dialog"
      aria-label="Loading"
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.08]" />
      <div className="absolute inset-0 bg-noise-soft opacity-[0.12] mix-blend-overlay" />
      <div className="absolute inset-0 bg-scanlines opacity-[0.06] mix-blend-overlay" />

      {/* glow blobs */}
      <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-gamehaus-purple/18 blur-[120px] gh-splash-float" />
      <div className="absolute -bottom-44 -right-44 h-[560px] w-[560px] rounded-full bg-gamehaus-magenta/14 blur-[130px] gh-splash-float2" />

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="relative w-full max-w-md">
          {/* card */}
          <div className="relative overflow-hidden rounded-3xl border border-gamehaus-purple/30 bg-black/45 backdrop-blur-xl shadow-2xl shadow-black/60">
            <div className="absolute inset-0 bg-gradient-to-br from-gamehaus-purple/10 via-transparent to-gamehaus-magenta/10" />
            <div className="absolute inset-0 gh-splash-shimmer opacity-40" />

            <div className="relative p-7 sm:p-8">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-[28px] bg-gradient-to-r from-gamehaus-purple/25 to-gamehaus-magenta/22 blur-2xl opacity-80" />
                  <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-[28px] border border-white/10 bg-black/40 backdrop-blur flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-grid-pattern opacity-[0.10]" />
                    <img
                      src={LOGO_PATH}
                      alt={`${BRAND_NAME} Logo`}
                      className="relative z-10 h-20 w-20 sm:h-24 sm:w-24 object-contain mix-blend-screen gh-splash-pop"
                      draggable={false}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-[11px] tracking-[0.28em] text-gray-400">
                  {BRAND_NAME.toUpperCase()}
                </p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {headline}
                </h1>
                <p className="mt-2 text-sm text-gray-300 leading-relaxed">
                  {subline}
                </p>
              </div>

              {/* progress */}
              <div className="mt-6">
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden border border-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gamehaus-purple via-gamehaus-magenta to-gamehaus-purple gh-splash-bar"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    Loading…
                  </span>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
              </div>

              <button
                type="button"
                className="mt-6 w-full rounded-2xl border border-white/10 bg-black/30 hover:bg-black/40 text-gray-200 text-xs py-2.5 transition-colors"
                onClick={onDone}
              >
                Tap to continue
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-[10px] text-gray-500">
            Designed for smooth performance on mobile & desktop.
          </p>
        </div>
      </div>
    </div>
  );
}

