import React, { useEffect, useMemo, useRef, useState } from "react";
import { LOGO_PATH, BRAND_NAME } from "@/config/brand";

type Props = {
  variant: "boot" | "login_success";
  onDone: () => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function MatrixRainCanvas({ intensity = 1 }: { intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduceMotion) return;

    const chars =
      "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@$%*+-<>[]{}()/\\|=;";

    let w = 0;
    let h = 0;
    let dpr = 1;

    let fontSize = 16; // px (CSS pixels)
    let columns = 0;
    let drops: number[] = [];
    let speeds: number[] = [];

    const reset = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Slightly adapt density to viewport
      const base = w < 420 ? 14 : w < 900 ? 16 : 18;
      fontSize = Math.round(base);
      columns = Math.min(160, Math.floor(w / fontSize));

      drops = Array.from({ length: columns }, () => Math.random() * (h / fontSize));
      speeds = Array.from({ length: columns }, () => (0.65 + Math.random() * 1.55) * intensity);

      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
      ctx.textBaseline = "top";
    };

    reset();

    const ro = new ResizeObserver(() => reset());
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();

    const draw = (t: number) => {
      const dt = Math.min(48, t - last);
      last = t;

      // Trail fade (lower alpha = longer trails)
      ctx.fillStyle = "rgba(0, 0, 0, 0.065)";
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < columns; i++) {
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Head character (bright)
        const head = chars.charAt((Math.random() * chars.length) | 0);
        ctx.fillStyle = "rgba(210, 255, 235, 0.95)";
        ctx.shadowColor = "rgba(0, 255, 170, 0.55)";
        ctx.shadowBlur = 10;
        ctx.fillText(head, x, y);

        // Body character (green)
        const body = chars.charAt((Math.random() * chars.length) | 0);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(0, 255, 170, 0.58)";
        ctx.fillText(body, x, Math.max(0, y - fontSize));

        // Advance
        drops[i] += (speeds[i] * dt) / 16.67;

        // Reset drop randomly after passing bottom (keeps variation)
        if (y > h + fontSize * 2 && Math.random() > 0.965) {
          drops[i] = -Math.random() * 12;
          speeds[i] = (0.65 + Math.random() * 1.55) * intensity;
        }
      }

      raf = requestAnimationFrame(draw);
    };

    // Start with a clean frame
    ctx.clearRect(0, 0, w, h);
    raf = requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none mix-blend-screen opacity-[0.75]"
      aria-hidden="true"
    />
  );
}

export default function SplashScreen({ variant, onDone }: Props) {
  const [progress, setProgress] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const [exiting, setExiting] = useState(false);
  const doneRef = useRef(false);

  const beginExit = (reason: "auto" | "click") => {
    if (doneRef.current) return;
    doneRef.current = true;
    setExiting(true);

    // Let the fade-out complete before unmounting.
    window.setTimeout(() => {
      onDone();
    }, reason === "click" ? 650 : 750);
  };

  const headline = useMemo(() => {
    if (variant === "login_success") return "Access granted.";
    return "GAMEHAUS OS";
  }, [variant]);

  const subline = useMemo(() => {
    if (variant === "login_success") return "Session established • policy checks • state sync";
    return "Kernel boot • module load • integrity checks";
  }, [variant]);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    // Keep it slow + cinematic (home + login).
    const duration = 3500;

    const tick = (t: number) => {
      const p = clamp((t - start) / duration, 0, 1);
      // Ease-out
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased);
      if (p >= 1) {
        beginExit("auto");
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [variant]);

  useEffect(() => {
    const base =
      variant === "login_success"
        ? [
            "AUTH OK • MFA VERIFIED",
            "ISSUING SESSION • ROTATING TOKENS",
            "POLICY CHECK • RBAC PASS",
            "DECRYPTING SECRETS • ENV OK",
            "SYNCING DATA • STATIONS/BOOKINGS",
            "LOADING ADMIN UI • HOTPATH READY",
            "READY.",
          ]
        : [
            "INIT KERNEL: GH-OS v1.9",
            "MOUNT FS: /mnt/arcade (rw)",
            "NETLINK UP • DHCP ACK",
            "TLS HANDSHAKE • EDGE OK",
            "LOAD MODULES: booking, status, chat",
            "VERIFY ASSETS • CACHE WARM",
            "READY.",
          ];

    setLines([]);
    let i = 0;
    const t = window.setInterval(() => {
      i++;
      setLines(base.slice(0, i));
      if (i >= base.length) window.clearInterval(t);
    }, 260);
    return () => window.clearInterval(t);
  }, [variant]);

  return (
    <div
      className={[
        "fixed inset-0 z-[999] overflow-hidden bg-gradient-to-br from-[#050507] via-[#120816] to-[#050507]",
        "transition-opacity duration-700 ease-out",
        exiting ? "opacity-0" : "opacity-100",
      ].join(" ")}
      role="dialog"
      aria-label="Loading"
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.08]" />
      <div className="absolute inset-0 bg-noise-soft opacity-[0.12] mix-blend-overlay" />
      <div className="absolute inset-0 bg-scanlines opacity-[0.06] mix-blend-overlay" />
      <MatrixRainCanvas intensity={variant === "login_success" ? 1.1 : 1} />
      <div className="absolute inset-0 gh-scanline opacity-[0.9]" />

      {/* glow blobs */}
      <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-gamehaus-purple/18 blur-[120px] gh-splash-float" />
      <div className="absolute -bottom-44 -right-44 h-[560px] w-[560px] rounded-full bg-gamehaus-magenta/14 blur-[130px] gh-splash-float2" />

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="relative w-full max-w-md">
          {/* card */}
          <div
            className={[
              "relative overflow-hidden rounded-3xl border border-gamehaus-purple/30 bg-black/45 backdrop-blur-xl shadow-2xl shadow-black/60",
              "transition-all duration-700 ease-out will-change-[transform,opacity,filter]",
              exiting ? "opacity-0 translate-y-2 scale-[0.985] blur-[1px]" : "opacity-100 translate-y-0 scale-100 blur-0",
            ].join(" ")}
          >
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
                <h1
                  className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white gh-glitch"
                  data-text={headline}
                >
                  {headline}
                </h1>
                <p className="mt-2 text-sm text-gray-300 leading-relaxed">
                  {subline}
                </p>
              </div>

              {/* terminal lines */}
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/35 p-4 text-left">
                <p className="text-[10px] tracking-[0.26em] text-gray-400">BOOT SEQUENCE</p>
                <div className="mt-3 space-y-1 font-mono text-[12px] leading-relaxed">
                  {lines.map((l) => (
                    <div key={l} className="flex items-center gap-2 text-gray-200">
                      <span className="text-green-400">▸</span>
                      <span>{l}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="text-gamehaus-magenta">▸</span>
                    <span className="opacity-80">Loading</span>
                    <span className="gh-blink-cursor">█</span>
                  </div>
                </div>
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
                onClick={() => beginExit("click")}
              >
                Enter the lounge
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-center text-[10px] text-gray-500">
              Designed for smooth performance on mobile & desktop.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] text-gray-300 backdrop-blur-md">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-gamehaus-cyan shadow-[0_0_18px_rgba(34,211,238,0.35)]" />
              <span className="tracking-wide">Powered by</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-purple via-gamehaus-magenta to-gamehaus-cyan font-semibold">
                Cuephoria Tech
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

