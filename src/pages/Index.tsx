import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Monitor, Trophy, Users, Star, ShieldCheck, Sparkles, Calendar, LogIn, Gamepad2, Timer, Table2, Radio, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Mail, Phone, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from '@/hooks/use-mobile';
import { BRAND_NAME, LOGO_PATH, PUBLIC_BOOKING_URL, SUPPORT_EMAIL } from '@/config/brand';
import NeonMarquee from "@/components/marketing/NeonMarquee";
import ExperienceShowcase from "@/components/marketing/ExperienceShowcase";
import TestimonialsSection from "@/components/marketing/TestimonialsSection";

interface Station {
  id: string;
  name: string;
  type: 'ps5' | '8ball' | 'foosball';
  hourly_rate: number;
  is_occupied: boolean;
}

const STATION_TYPE_ORDER: Station["type"][] = ["8ball", "foosball", "ps5"];

const STATION_TYPE_META: Record<
  Station["type"],
  {
    title: string;
    subtitle: string;
    Icon: typeof Gamepad2;
    accentClass: string;
    chipClass: string;
  }
> = {
  "8ball": {
    title: "Pool Tables",
    subtitle: "8-ball tables",
    Icon: Timer,
    accentClass: "from-emerald-500/18 via-emerald-500/8 to-emerald-500/18 border-emerald-500/35",
    chipClass: "bg-emerald-500/12 text-emerald-200 border-emerald-500/25",
  },
  foosball: {
    title: "Foosball",
    subtitle: "Foosball tables",
    Icon: Table2,
    accentClass: "from-amber-500/18 via-amber-500/8 to-amber-500/18 border-amber-500/35",
    chipClass: "bg-amber-500/12 text-amber-200 border-amber-500/25",
  },
  ps5: {
    title: "PlayStation 5",
    subtitle: "PS5 stations",
    Icon: Gamepad2,
    accentClass: "from-sky-500/18 via-sky-500/8 to-sky-500/18 border-sky-500/35",
    chipClass: "bg-sky-500/12 text-sky-200 border-sky-500/25",
  },
};

const getStationImageSrc = (station: Station): string | null => {
  if (station.type === "foosball") return "/Foosball.jpeg";
  if (station.type !== "8ball") return null;

  const name = station.name.toLowerCase();
  if (name.includes("american")) return "/American table.jpg";
  if (name.includes("medium")) return "/Medium Table.jpg";
  if (name.includes("standard")) return "/Standard Table.jpg";

  return null;
};

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [liveStations, setLiveStations] = useState<Station[]>([]);
  const [stationsLoading, setStationsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // High-tech cursor glow (desktop-first, lightweight)
  useEffect(() => {
    // Avoid heavy pointer glow on touch / reduced-motion devices (helps jitter)
    if (typeof window === "undefined") return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const finePointer = window.matchMedia?.("(pointer: fine)")?.matches;
    if (reduceMotion || !finePointer) return;

    const root = document.documentElement;
    let raf = 0;
    let latestX = 0;
    let latestY = 0;

    const apply = () => {
      root.style.setProperty("--mx", `${latestX}px`);
      root.style.setProperty("--my", `${latestY}px`);
      raf = 0;
    };

    const onMove = (e: PointerEvent) => {
      latestX = e.clientX;
      latestY = e.clientY;
      if (!raf) raf = window.requestAnimationFrame(apply);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // Fetch live station data
  useEffect(() => {
    const fetchLiveStations = async () => {
      try {
        const { data, error } = await supabase
          .from('stations')
          .select('*')
          .order('name');
        
        if (error) throw error;
        const normalized: Station[] = (data || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          type: row.type === "ps5" || row.type === "8ball" || row.type === "foosball" ? row.type : "ps5",
          hourly_rate: row.hourly_rate,
          is_occupied: row.is_occupied,
        }));
        setLiveStations(normalized);
        setStationsLoading(false);
      } catch (error) {
        console.error('Error fetching stations:', error);
        setStationsLoading(false);
      }
    };

    fetchLiveStations();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveStations, 30000);
    
    // Real-time subscription
    const channel = supabase
      .channel('stations-live')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'stations' },
        () => fetchLiveStations()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const totalStations = liveStations.length;
  const availableStations = liveStations.filter((s) => !s.is_occupied).length;
  const occupiedStations = totalStations - availableStations;

  const groupedStations = (() => {
    const groups = new Map<Station["type"], Station[]>();
    for (const t of STATION_TYPE_ORDER) groups.set(t, []);

    for (const s of liveStations) {
      const list = groups.get(s.type);
      if (list) list.push(s);
    }

    const byAvailabilityThenName = (a: Station, b: Station) => {
      if (a.is_occupied !== b.is_occupied) return a.is_occupied ? 1 : -1; // available first
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    };

    return STATION_TYPE_ORDER.map((type) => {
      const stations = groups.get(type) ?? [];
      stations.sort(byAvailabilityThenName);
      return { type, stations };
    }).filter((g) => g.stations.length > 0);
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#1a0f1a] to-[#1a1a1a] flex flex-col relative overflow-hidden">
      {/* Elegant animated background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Premium grid + texture */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.06] pointer-events-none" />
        <div className="absolute inset-0 bg-noise-soft opacity-[0.10] mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-scanlines opacity-[0.04] mix-blend-overlay pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(650px circle at var(--mx, 50vw) var(--my, 30vh), rgba(255, 74, 26, 0.14), transparent 45%)",
          }}
        />
        
        {/* Elegant gradients */}
        <div className="absolute top-0 left-1/4 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-gamehaus-purple/10 to-transparent blur-[120px] animate-float opacity-30"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-gamehaus-magenta/10 to-transparent blur-[100px] animate-float opacity-30" style={{animationDelay: '3s'}}></div>
        
        {/* Subtle light streaks */}
        <div className="absolute top-[25%] w-full h-px bg-gradient-to-r from-transparent via-gamehaus-purple/15 to-transparent"></div>
        <div className="absolute top-[65%] w-full h-px bg-gradient-to-r from-transparent via-gamehaus-magenta/15 to-transparent"></div>
        
        {/* Elegant floating particles */}
        <div className="absolute w-2 h-2 bg-gamehaus-lightpurple/20 rounded-full top-1/4 left-1/4 animate-float"></div>
        <div className="absolute w-2 h-2 bg-gamehaus-magenta/20 rounded-full top-3/4 right-1/4 animate-float" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute w-2 h-2 bg-gamehaus-lightpurple/20 rounded-full top-1/2 left-3/4 animate-float" style={{animationDelay: '2.5s'}}></div>
        <div className="absolute w-1.5 h-1.5 bg-gamehaus-magenta/20 rounded-full top-1/3 right-1/3 animate-float" style={{animationDelay: '3.5s'}}></div>
      </div>

      {/* Header */}
      <header className="h-20 md:h-24 flex items-center px-4 md:px-8 border-b border-gamehaus-purple/30 relative z-10 backdrop-blur-md bg-black/40">
        <Logo />
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <Button
            variant="outline"
            size={isMobile ? "icon" : "default"}
            className="text-gamehaus-lightpurple border-gamehaus-purple/50 hover:bg-gamehaus-purple/30 hover:border-gamehaus-purple/70 transition-all duration-300"
            onClick={() => navigate('/login')}
            title="Management Login"
          >
            <LogIn className="h-4 w-4 md:mr-2" />
            {!isMobile && <span>Management Login</span>}
          </Button>
          <Button
            variant="default"
            size={isMobile ? "sm" : "default"}
            className="bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta text-white hover:from-gamehaus-purple hover:to-gamehaus-magenta shadow-lg shadow-gamehaus-purple/50 transition-all duration-300 text-sm md:text-base"
            onClick={() => window.open(PUBLIC_BOOKING_URL, '_blank')}
          >
            <Calendar className="h-4 w-4 md:mr-2" />
            <span className="hidden sm:inline">Book a Slot</span>
            <span className="sm:hidden">Book</span>
          </Button>
        </div>
      </header>

      {/* Hero section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 md:py-16 relative z-10">
        <div className="mb-6 sm:mb-8 md:mb-10 animate-float-shadow">
          <div className="relative">
            <div className="absolute -inset-3 bg-gradient-to-r from-gamehaus-purple/30 to-gamehaus-magenta/30 rounded-full opacity-80 blur-2xl animate-pulse-glow"></div>
            <img
              src={LOGO_PATH}
              alt={`${BRAND_NAME} Logo`} 
              className="h-36 sm:h-40 md:h-44 lg:h-56 relative z-10 drop-shadow-[0_0_22px_rgba(255,74,26,0.6)] mix-blend-screen"
              style={{ transform: "scale(1.1)", transformOrigin: "center" }}
            />
          </div>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-center text-white font-heading leading-tight mb-4 md:mb-6 tracking-tight px-2">
          Welcome to{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-lightpurple via-gamehaus-magenta to-gamehaus-purple animate-text-gradient">
            {BRAND_NAME}
          </span>
        </h1>
        
        <p className="text-lg sm:text-xl md:text-2xl text-center text-gamehaus-lightpurple/80 max-w-3xl mb-3 md:mb-4 font-light px-4">
          Chennai's Premier Snooker & Gaming Lounge
        </p>
        
        <p className="text-base sm:text-lg text-center text-gray-300 max-w-2xl mb-6 md:mb-8 px-4">
          A premium lounge for tournament-grade snooker & pool, next‑gen console sessions, and competitive community nights — designed for comfort, focus, and serious play.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-8 px-4">
          <Badge className="bg-black/40 text-gray-200 border border-gamehaus-purple/30 backdrop-blur-sm hover:bg-black/50 transition-colors">
            <Radio className="h-3 w-3 mr-1.5 text-green-400" />
            Live availability
          </Badge>
          <Badge className="bg-black/40 text-gray-200 border border-gamehaus-purple/30 backdrop-blur-sm hover:bg-black/50 transition-colors">
            <ShieldCheck className="h-3 w-3 mr-1.5 text-gamehaus-lightpurple" />
            Secure booking flow
          </Badge>
          <Badge className="bg-black/40 text-gray-200 border border-gamehaus-purple/30 backdrop-blur-sm hover:bg-black/50 transition-colors">
            <Trophy className="h-3 w-3 mr-1.5 text-gamehaus-magenta" />
            Tournament-ready tables
          </Badge>
          <Badge className="bg-black/40 text-gray-200 border border-gamehaus-purple/30 backdrop-blur-sm hover:bg-black/50 transition-colors">
            <Gamepad2 className="h-3 w-3 mr-1.5 text-gamehaus-lightpurple" />
            Console & lounge sessions
          </Badge>
          <Badge className="bg-black/40 text-gray-200 border border-gamehaus-purple/30 backdrop-blur-sm hover:bg-black/50 transition-colors">
            <MapPin className="h-3 w-3 mr-1.5 text-gamehaus-magenta" />
            T. Nagar, Chennai
          </Badge>
        </div>

        <div className="mb-10 md:mb-14 w-full">
          <NeonMarquee />
        </div>
        
        {/* Primary Booking CTA - Prominent */}
        <div className="mb-12 md:mb-16 flex flex-col items-center px-4">
          <Button
            size="lg"
            className="bg-gradient-to-r from-gamehaus-purple via-gamehaus-magenta to-gamehaus-purple text-white hover:from-gamehaus-purple hover:via-gamehaus-magenta hover:to-gamehaus-purple shadow-2xl shadow-gamehaus-purple/50 transition-all duration-300 text-base sm:text-lg md:text-xl px-8 sm:px-12 py-5 sm:py-6 rounded-full group relative overflow-hidden animate-pulse-soft"
            onClick={() => window.open(PUBLIC_BOOKING_URL, '_blank')}
          >
            <div className="absolute inset-0 w-full bg-gradient-to-r from-gamehaus-purple/0 via-white/20 to-gamehaus-purple/0 animate-shimmer pointer-events-none"></div>
            <Calendar className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform" />
            <span className="font-bold">Reserve a Slot</span>
          </Button>
          <p className="text-xs sm:text-sm text-gray-400 mt-3 md:mt-4 text-center max-w-md px-2">
            Click above to book your snooker table, pool table, PlayStation 5, or foosball session
          </p>
        </div>
        
        {/* Secondary Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-20 justify-center">
          <Button
            size="lg"
            variant="outline"
            className="text-gamehaus-lightpurple border-gamehaus-purple/60 hover:bg-gamehaus-purple/30 hover:border-gamehaus-lightpurple/80 group relative overflow-hidden transition-all duration-300 text-lg px-8"
            onClick={() => navigate('/public/stations')}
          >
            <div className="absolute inset-0 w-full bg-gradient-to-r from-gamehaus-purple/0 via-gamehaus-lightpurple/20 to-gamehaus-purple/0 animate-shimmer pointer-events-none"></div>
            <Monitor className="mr-2 h-5 w-5 animate-pulse-soft" />
            <span>View Table Availability</span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="text-gamehaus-lightpurple border-gamehaus-purple/60 hover:bg-gamehaus-purple/30 hover:border-gamehaus-lightpurple/80 group relative overflow-hidden transition-all duration-300 text-lg px-8"
            onClick={() => navigate('/public/tournaments')}
          >
            <div className="absolute inset-0 w-full bg-gradient-to-r from-gamehaus-magenta/0 via-gamehaus-lightpurple/15 to-gamehaus-magenta/0 animate-shimmer pointer-events-none"></div>
            <Trophy className="mr-2 h-5 w-5 animate-pulse-soft" />
            <span>Explore Tournaments</span>
          </Button>
        </div>

        {/* Live Station Status Section */}
        <div className="w-full max-w-6xl mx-auto mb-12 md:mb-20 px-4">
          <div className="bg-gradient-to-br from-black/70 via-gamehaus-purple/20 to-black/70 border border-gamehaus-purple/50 rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12 relative overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
            <div className="absolute top-0 right-0 h-96 w-96 bg-gamehaus-purple/10 blur-3xl rounded-full"></div>
            <div className="absolute bottom-0 left-0 h-96 w-96 bg-gamehaus-magenta/10 blur-3xl rounded-full"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-gamehaus-purple/30 to-gamehaus-magenta/30 border border-gamehaus-purple/40 shrink-0">
                    <Radio className="h-5 w-5 sm:h-6 sm:w-6 text-gamehaus-lightpurple animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">Live Station Status</h2>
                    <p className="text-gray-400 text-xs sm:text-sm flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0"></span>
                      <span className="truncate">Real-time updates every 30 seconds</span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gamehaus-lightpurple border-gamehaus-purple/50 hover:bg-gamehaus-purple/30 shrink-0 whitespace-nowrap text-xs sm:text-sm"
                  onClick={() => navigate('/public/stations')}
                >
                  View All Stations
                </Button>
              </div>

              {stationsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5 animate-pulse"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-11 w-11 rounded-xl bg-white/10" />
                          <div className="min-w-0">
                            <div className="h-4 w-40 max-w-[60vw] bg-white/10 rounded" />
                            <div className="mt-2 h-3 w-24 bg-white/10 rounded" />
                          </div>
                        </div>
                        <div className="h-6 w-24 bg-white/10 rounded-full" />
                      </div>
                      <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                        <div className="h-3 w-14 bg-white/10 rounded" />
                        <div className="h-5 w-20 bg-white/10 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Quick summary */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-green-500/15 text-green-200 border-green-500/25">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      {availableStations} Available
                    </Badge>
                    <Badge className="bg-red-500/15 text-red-200 border-red-500/25">
                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                      {occupiedStations} Occupied
                    </Badge>
                    <Badge className="bg-white/10 text-gray-200 border-white/15">
                      <Monitor className="h-3.5 w-3.5 mr-1.5" />
                      {totalStations} Total
                    </Badge>
                    <span className="text-xs text-gray-400 ml-1">Grouped by category • Available first</span>
                  </div>

                  {/* Grouped sections */}
                  <div className="space-y-4">
                    {groupedStations.map(({ type, stations }) => {
                      const meta = STATION_TYPE_META[type];
                      const availableInGroup = stations.filter((s) => !s.is_occupied).length;
                      const totalInGroup = stations.length;
                      const Icon = meta.Icon;

                      return (
                        <div
                          key={type}
                          className={`rounded-2xl border bg-gradient-to-br ${meta.accentClass} overflow-hidden`}
                        >
                          <div className="p-4 sm:p-5 border-b border-white/10 bg-black/20 backdrop-blur-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`h-11 w-11 rounded-xl border border-white/10 bg-black/30 flex items-center justify-center shrink-0`}>
                                  <Icon className="h-5 w-5 text-white/85" />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">{meta.title}</h3>
                                  <p className="text-xs sm:text-sm text-gray-300/80 truncate">{meta.subtitle}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={meta.chipClass}>
                                  {availableInGroup}/{totalInGroup} available
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 sm:p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {stations.map((station) => (
                                <div
                                  key={station.id}
                                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                                    station.is_occupied
                                      ? "border-red-500/25 bg-red-500/5"
                                      : "border-emerald-500/25 bg-emerald-500/5"
                                  } hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-black/30`}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/6 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                  <div className="p-5 relative z-10">
                                    {(() => {
                                      const imageSrc = getStationImageSrc(station);
                                      if (!imageSrc) return null;
                                      return (
                                        <div className="relative mb-4 overflow-hidden rounded-xl border border-white/10 bg-black/25">
                                          <img
                                            src={imageSrc}
                                            alt={`${station.name} table`}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-28 w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.04]"
                                          />
                                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                                        </div>
                                      );
                                    })()}

                                    <div className="flex items-start justify-between gap-4 mb-4">
                                      <div className="min-w-0">
                                        <h4 className="text-base sm:text-lg font-bold text-white truncate">{station.name}</h4>
                                        <p className="mt-1 text-xs text-gray-400">
                                          ₹{station.hourly_rate}/hr
                                        </p>
                                      </div>
                                      <Badge
                                        className={
                                          station.is_occupied
                                            ? "bg-red-500/15 text-red-200 border-red-500/25"
                                            : "bg-emerald-500/15 text-emerald-200 border-emerald-500/25 animate-pulse-soft"
                                        }
                                      >
                                        {station.is_occupied ? (
                                          <XCircle className="h-3 w-3 mr-1" />
                                        ) : (
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                        )}
                                        {station.is_occupied ? "Occupied" : "Available"}
                                      </Badge>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                      <span className="text-xs text-gray-400">Category</span>
                                      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${meta.chipClass}`}>
                                        {meta.title}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {liveStations.length === 0 && !stationsLoading && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No stations available at the moment</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="w-full max-w-6xl mx-auto mb-12 bg-gamehaus-purple/20" />

        {/* Experience Overview */}
        <div className="w-full max-w-6xl mx-auto mb-16 px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Inside <span className="bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-lightpurple via-gamehaus-magenta to-gamehaus-purple animate-text-gradient">{BRAND_NAME}</span>
            </h2>
            <p className="mt-4 text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Built like a modern arena and run like a professional club. Whether you're here to practice quietly, compete with friends, or host a weekend tournament,
              our space is tuned for serious play—clean tables, comfortable seating, and a staff-led flow that keeps sessions on time.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="relative overflow-hidden rounded-2xl border border-gamehaus-purple/30 bg-gradient-to-br from-black/60 via-gamehaus-purple/10 to-black/60 p-6 backdrop-blur-sm hover:border-gamehaus-purple/50 transition-all duration-300">
              <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gamehaus-purple/30 to-gamehaus-magenta/20 flex items-center justify-center border border-gamehaus-purple/30">
                    <Trophy className="h-5 w-5 text-gamehaus-lightpurple" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Snooker</h3>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Tournament-caliber tables and consistent playing conditions—ideal for technique work, match practice, and competitive frames.
                </p>
                <p className="mt-3 text-xs text-gray-400">Best for: practice sessions, coaching, league nights</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-gamehaus-purple/30 bg-gradient-to-br from-black/60 via-gamehaus-magenta/10 to-black/60 p-6 backdrop-blur-sm hover:border-gamehaus-purple/50 transition-all duration-300">
              <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gamehaus-magenta/25 to-gamehaus-purple/15 flex items-center justify-center border border-gamehaus-purple/30">
                    <Timer className="h-5 w-5 text-gamehaus-lightpurple" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Pool</h3>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Fast games, clean pockets, and a great vibe for groups. Perfect for casual sets or a quick competitive run.
                </p>
                <p className="mt-3 text-xs text-gray-400">Best for: friends & groups, quick matches, weekends</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-gamehaus-purple/30 bg-gradient-to-br from-black/60 via-gamehaus-purple/10 to-black/60 p-6 backdrop-blur-sm hover:border-gamehaus-purple/50 transition-all duration-300">
              <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gamehaus-purple/30 to-gamehaus-magenta/20 flex items-center justify-center border border-gamehaus-purple/30">
                    <Gamepad2 className="h-5 w-5 text-gamehaus-lightpurple" />
                  </div>
                  <h3 className="text-lg font-bold text-white">PlayStation 5</h3>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  A comfortable console setup for competitive titles or chill co‑op. Bring your squad and keep the sessions flowing.
                </p>
                <p className="mt-3 text-xs text-gray-400">Best for: competitive gaming, co‑op nights, teams</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-gamehaus-purple/30 bg-gradient-to-br from-black/60 via-gamehaus-magenta/10 to-black/60 p-6 backdrop-blur-sm hover:border-gamehaus-purple/50 transition-all duration-300">
              <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gamehaus-magenta/25 to-gamehaus-purple/15 flex items-center justify-center border border-gamehaus-purple/30">
                    <Table2 className="h-5 w-5 text-gamehaus-lightpurple" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Foosball Table</h3>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Fast, competitive matches with friends—perfect for quick games, group hangouts, and bracket-style showdowns.
                </p>
                <p className="mt-3 text-xs text-gray-400">Best for: groups, quick matches, competitive vibes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full mb-16">
          <ExperienceShowcase />
        </div>
        
        {/* Features - Enhanced */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mx-auto mb-20">
          <div className="bg-gradient-to-br from-black/70 via-gamehaus-purple/30 to-black/70 p-8 rounded-2xl border-2 border-gamehaus-purple/40 hover:border-gamehaus-purple/60 transition-all duration-500 hover:shadow-2xl hover:shadow-gamehaus-purple/40 hover:-translate-y-2 group backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-gamehaus-purple/0 via-white/5 to-gamehaus-purple/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-5">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-gamehaus-purple/30 to-gamehaus-magenta/30 flex items-center justify-center text-gamehaus-lightpurple group-hover:scale-110 transition-transform duration-300 border-2 border-gamehaus-purple/40 shadow-lg shadow-gamehaus-purple/20">
                  <Trophy size={28} />
                </div>
                <h3 className="ml-4 text-2xl font-bold text-white">Professional Tables</h3>
              </div>
              <p className="text-gray-300 leading-relaxed mb-4">Experience world-class snooker and pool tables, meticulously maintained to professional tournament standards.</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>1 Standard Snooker Table</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>1 American Pool Table</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>2 Medium Tables (8‑Ball & Snooker)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>Tournament-Grade Equipment</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-black/70 via-gamehaus-magenta/30 to-black/70 p-8 rounded-2xl border-2 border-gamehaus-magenta/40 hover:border-gamehaus-magenta/60 transition-all duration-500 hover:shadow-2xl hover:shadow-gamehaus-magenta/40 hover:-translate-y-2 group backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-gamehaus-magenta/0 via-white/5 to-gamehaus-magenta/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-5">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-gamehaus-magenta/30 to-gamehaus-purple/30 flex items-center justify-center text-gamehaus-magenta group-hover:scale-110 transition-transform duration-300 border-2 border-gamehaus-magenta/40 shadow-lg shadow-gamehaus-magenta/20">
                  <Sparkles size={28} />
                </div>
                <h3 className="ml-4 text-2xl font-bold text-white">Refined Ambiance</h3>
              </div>
              <p className="text-gray-300 leading-relaxed mb-4">Immerse yourself in our sophisticated lounge atmosphere, designed for serious players and enthusiasts alike.</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>Premium Lighting & Acoustics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>Climate-Controlled Environment</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>Elegant Lounge Seating</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-black/70 via-gamehaus-purple/30 to-black/70 p-8 rounded-2xl border-2 border-gamehaus-purple/40 hover:border-gamehaus-purple/60 transition-all duration-500 hover:shadow-2xl hover:shadow-gamehaus-purple/40 hover:-translate-y-2 group backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-gamehaus-purple/0 via-white/5 to-gamehaus-purple/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-5">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-gamehaus-purple/30 to-gamehaus-magenta/30 flex items-center justify-center text-gamehaus-lightpurple group-hover:scale-110 transition-transform duration-300 border-2 border-gamehaus-purple/40 shadow-lg shadow-gamehaus-purple/20">
                  <Users size={28} />
                </div>
                <h3 className="ml-4 text-2xl font-bold text-white">Elite Community</h3>
              </div>
              <p className="text-gray-300 leading-relaxed mb-4">Join our exclusive community of skilled players, participate in tournaments, and refine your game.</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>Regular Tournaments & Events</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>Skill Development Programs</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>Networking Opportunities</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="w-full max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          <div className="text-center p-6 bg-gradient-to-br from-black/60 to-gamehaus-purple/30 backdrop-blur-md rounded-xl border border-gamehaus-purple/40 hover:border-gamehaus-purple/60 transition-all duration-300 hover:shadow-lg hover:shadow-gamehaus-purple/30">
            <Trophy className="h-8 w-8 text-gamehaus-lightpurple mx-auto mb-3" />
            <div className="text-3xl font-bold text-white">4</div>
            <div className="text-sm text-gray-300 mt-1">Tables (8‑Ball & Snooker)</div>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-black/60 to-gamehaus-magenta/30 backdrop-blur-md rounded-xl border border-gamehaus-magenta/40 hover:border-gamehaus-magenta/60 transition-all duration-300 hover:shadow-lg hover:shadow-gamehaus-magenta/30">
            <Table2 className="h-8 w-8 text-gamehaus-magenta mx-auto mb-3" />
            <div className="text-3xl font-bold text-white">1</div>
            <div className="text-sm text-gray-300 mt-1">Foosball Table</div>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-black/60 to-gamehaus-purple/30 backdrop-blur-md rounded-xl border border-gamehaus-purple/40 hover:border-gamehaus-purple/60 transition-all duration-300 hover:shadow-lg hover:shadow-gamehaus-purple/30">
            <Users className="h-8 w-8 text-gamehaus-lightpurple mx-auto mb-3" />
            <div className="text-3xl font-bold text-white">2</div>
            <div className="text-sm text-gray-300 mt-1">PlayStation 5</div>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-black/60 to-gamehaus-magenta/30 backdrop-blur-md rounded-xl border border-gamehaus-magenta/40 hover:border-gamehaus-magenta/60 transition-all duration-300 hover:shadow-lg hover:shadow-gamehaus-magenta/30">
            <Sparkles className="h-8 w-8 text-gamehaus-magenta mx-auto mb-3" />
            <div className="text-3xl font-bold text-white">Premium</div>
            <div className="text-sm text-gray-300 mt-1">Experience</div>
          </div>
        </div>

        <Separator className="w-full max-w-6xl mx-auto mb-12 bg-gamehaus-purple/20" />

        <div className="w-full mb-20">
          <TestimonialsSection />
        </div>

        {/* How it works */}
        <div className="w-full max-w-6xl mx-auto mb-20 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                A smooth booking flow—built for <span className="text-gamehaus-lightpurple">players</span>
              </h2>
              <p className="mt-4 text-gray-300 leading-relaxed">
                We designed the experience to feel premium: clear availability, simple selection, and quick confirmation.
                Whether you’re booking a quiet practice slot or coordinating a group, the flow stays fast and predictable.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                  <span><span className="font-semibold text-white">Real-time station view</span> so you can plan without guessing.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                  <span><span className="font-semibold text-white">Transparent hourly pricing</span> shown directly on stations.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                  <span><span className="font-semibold text-white">On-floor support</span> to keep games running smoothly and on time.</span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gamehaus-purple/30 bg-black/50 p-5 backdrop-blur-sm hover:border-gamehaus-purple/50 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-xl bg-gamehaus-purple/20 border border-gamehaus-purple/30 flex items-center justify-center">
                    <Monitor className="h-5 w-5 text-gamehaus-lightpurple" />
                  </div>
                  <p className="font-semibold text-white">1. Check availability</p>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">See what’s free right now and pick the station that fits your vibe.</p>
              </div>

              <div className="rounded-2xl border border-gamehaus-purple/30 bg-black/50 p-5 backdrop-blur-sm hover:border-gamehaus-purple/50 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-xl bg-gamehaus-magenta/15 border border-gamehaus-purple/30 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-gamehaus-lightpurple" />
                  </div>
                  <p className="font-semibold text-white">2. Reserve your slot</p>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">Choose your timing and confirm in a few taps.</p>
              </div>

              <div className="rounded-2xl border border-gamehaus-purple/30 bg-black/50 p-5 backdrop-blur-sm hover:border-gamehaus-purple/50 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-xl bg-gamehaus-purple/20 border border-gamehaus-purple/30 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-gamehaus-lightpurple" />
                  </div>
                  <p className="font-semibold text-white">3. Get confirmed</p>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">You’ll see a clear confirmation and can plan your arrival.</p>
              </div>

              <div className="rounded-2xl border border-gamehaus-purple/30 bg-black/50 p-5 backdrop-blur-sm hover:border-gamehaus-purple/50 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-xl bg-gamehaus-magenta/15 border border-gamehaus-purple/30 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-gamehaus-lightpurple" />
                  </div>
                  <p className="font-semibold text-white">4. Play in comfort</p>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">Walk in, settle in, and enjoy a premium lounge atmosphere.</p>
              </div>
            </div>
          </div>
        </div>

        <Separator className="w-full max-w-6xl mx-auto mb-12 bg-gamehaus-purple/20" />

        {/* FAQ */}
        <div className="w-full max-w-6xl mx-auto mb-20 px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Frequently asked questions</h2>
            <p className="mt-4 text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Quick clarity on bookings, walk-ins, timing, and what to expect when you arrive.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-gamehaus-purple/30 bg-gradient-to-br from-black/60 via-gamehaus-purple/10 to-black/60 backdrop-blur-md p-5 sm:p-8">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]" />
            <div className="relative">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-gamehaus-purple/20">
                  <AccordionTrigger className="text-left text-white hover:no-underline">
                    How do bookings work?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    Use “Reserve a Slot” to pick your station and time. You’ll get a clear confirmation, and you can also view live station status anytime before arriving.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border-gamehaus-purple/20">
                  <AccordionTrigger className="text-left text-white hover:no-underline">
                    Can I walk in without a booking?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    Yes—walk-ins are welcome when stations are available. For peak hours and weekends, we recommend booking to lock your preferred slot.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border-gamehaus-purple/20">
                  <AccordionTrigger className="text-left text-white hover:no-underline">
                    What’s your cancellation policy?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    Please refer to the Terms in the footer for full details. As a general rule, earlier changes are easier to accommodate; late cancellations and no-shows may incur a fee.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="border-gamehaus-purple/20">
                  <AccordionTrigger className="text-left text-white hover:no-underline">
                    Do you host tournaments or group sessions?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    Absolutely. We regularly run events and competitive formats. Check the tournaments page for upcoming listings and registration details.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5" className="border-gamehaus-purple/20">
                  <AccordionTrigger className="text-left text-white hover:no-underline">
                    I’m staff/admin—where do I sign in?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    Use “Management Login” at the top-right. The portal is for internal operations like bookings, billing, and station management.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="w-full max-w-5xl mx-auto bg-gradient-to-br from-black/70 via-gamehaus-purple/40 to-black/70 border border-gamehaus-purple/50 rounded-3xl p-12 relative overflow-hidden backdrop-blur-md">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="absolute top-0 right-0 h-80 w-80 bg-gamehaus-purple/10 blur-3xl rounded-full"></div>
          <div className="absolute bottom-0 left-0 h-80 w-80 bg-gamehaus-magenta/10 blur-3xl rounded-full"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-6 tracking-tight">Ready to Experience {BRAND_NAME}?</h2>
            <p className="text-center text-gray-300 mb-10 max-w-2xl mx-auto text-lg leading-relaxed">
              Step into Chennai's most sophisticated snooker, pool, and gaming venue. Reserve your table and experience excellence.
            </p>
            <div className="flex flex-col items-center gap-6">
              <Button
                size="lg"
                className="bg-gradient-to-r from-gamehaus-purple via-gamehaus-magenta to-gamehaus-purple text-white hover:from-gamehaus-purple hover:via-gamehaus-magenta hover:to-gamehaus-purple shadow-2xl shadow-gamehaus-purple/50 group transition-all duration-300 text-xl px-12 py-6 rounded-full relative overflow-hidden animate-pulse-soft"
                onClick={() => window.open(PUBLIC_BOOKING_URL, '_blank')}
              >
                <div className="absolute inset-0 w-full bg-gradient-to-r from-gamehaus-purple/0 via-white/20 to-gamehaus-purple/0 animate-shimmer pointer-events-none"></div>
                <Calendar className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />
                <span className="font-bold">Book a Slot Now</span>
              </Button>
              <p className="text-sm text-gray-400 text-center max-w-md">
                Reserve your preferred table or gaming station in just a few clicks
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-gamehaus-lightpurple border-gamehaus-purple/60 hover:bg-gamehaus-purple/30 hover:border-gamehaus-lightpurple/80 transition-all duration-300 text-base px-6"
                  onClick={() => navigate('/public/stations')}
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  View All Stations
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mt-auto border-t border-gamehaus-purple/25 bg-black/35 backdrop-blur-md">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] pointer-events-none" />
        <div className="absolute inset-0 bg-noise-soft opacity-[0.08] mix-blend-overlay pointer-events-none" />
        <div className="pointer-events-none absolute -top-24 left-1/4 h-48 w-48 rounded-full bg-gradient-to-br from-gamehaus-purple/18 to-transparent blur-[70px]" />
        <div className="pointer-events-none absolute -top-24 right-1/4 h-48 w-48 rounded-full bg-gradient-to-br from-gamehaus-magenta/14 to-transparent blur-[70px]" />

        <div className="relative max-w-6xl mx-auto px-6 md:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Logo size="sm" />
                <div>
                  <p className="text-sm font-semibold text-white">{BRAND_NAME}</p>
                  <p className="text-xs tracking-[0.2em] text-gray-400">PREMIER GAMING LOUNGE</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                Tournament-grade tables, next‑gen console sessions, and a premium lounge vibe—built for smooth bookings and clean gameplay.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-black/40 text-gray-200 border border-gamehaus-purple/30 backdrop-blur-sm hover:bg-black/50 transition-colors">
                  <Radio className="h-3 w-3 mr-1.5 text-green-400" />
                  Live status
                </Badge>
                <Badge className="bg-black/40 text-gray-200 border border-gamehaus-purple/30 backdrop-blur-sm hover:bg-black/50 transition-colors">
                  <ShieldCheck className="h-3 w-3 mr-1.5 text-gamehaus-lightpurple" />
                  Secure booking
                </Badge>
                <Badge className="bg-black/40 text-gray-200 border border-gamehaus-purple/30 backdrop-blur-sm hover:bg-black/50 transition-colors">
                  <Trophy className="h-3 w-3 mr-1.5 text-gamehaus-magenta" />
                  Tournaments
                </Badge>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <p className="text-xs tracking-[0.25em] text-gray-400">QUICK LINKS</p>
              <div className="mt-4 flex flex-col gap-1">
                <a
                  href={PUBLIC_BOOKING_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="footer-link"
                >
                  Book a slot
                </a>
                <button type="button" className="footer-link" onClick={() => navigate("/public/stations")}>
                  Live availability
                </button>
                <button type="button" className="footer-link" onClick={() => navigate("/public/tournaments")}>
                  Tournaments
                </button>
                <button type="button" className="footer-link" onClick={() => navigate("/login")}>
                  Management login
                </button>
              </div>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs tracking-[0.25em] text-gray-400">LEGAL</p>
              <div className="mt-4 flex flex-col gap-1">
                <Dialog open={openDialog === "terms"} onOpenChange={(open) => setOpenDialog(open ? "terms" : null)}>
                  <Button variant="ghost" size="sm" className="footer-link justify-start" onClick={() => setOpenDialog("terms")}>
                    Terms & Conditions
                  </Button>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-[#1a1a1a] to-[#1a0f1a] border-gamehaus-purple/40 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-white">Terms and Conditions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 text-gray-300 mt-4">
                      <p className="text-xs text-gray-400">
                        Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                      </p>

                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">0. Overview</h2>
                        <p>
                          These Terms explain how bookings, walk-ins, payments, cancellations, and on‑premise conduct work at {BRAND_NAME}.
                          They are designed to keep sessions fair, predictable, and safe for everyone.
                        </p>
                      </section>

                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">1. Acceptance of Terms</h2>
                        <p>
                          By accessing and using {BRAND_NAME}'s services, you agree to be bound by these Terms and Conditions.
                          If you do not agree to these terms, please do not use our services.
                        </p>
                      </section>
                      
                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">2. Table Reservations</h2>
                        <p>
                          {BRAND_NAME} provides snooker and 8-ball pool facilities on a reservation or walk-in basis, subject to availability.
                          Members receive preferential rates and booking privileges.
                        </p>
                        <p>
                          All sessions are charged according to our current rate card. Extensions are subject to availability and additional charges.
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-sm">
                          <li>Bookings are time-bound; arriving late may reduce your playable time during peak hours.</li>
                          <li>Station allocation may change in exceptional cases (maintenance/safety), while keeping your experience equivalent.</li>
                          <li>Rates may differ by station type and time; always confirm prices shown during booking.</li>
                        </ul>
                      </section>
                      
                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">3. Club Conduct</h2>
                        <p>
                          Members and guests must maintain appropriate conduct within our premises. {BRAND_NAME} reserves the right to refuse service
                          to anyone engaging in disruptive, abusive, or inappropriate behavior.
                        </p>
                        <p>
                          Players are responsible for any damage caused to equipment, tables, or fixtures through improper use.
                          Damages will be charged at repair or replacement cost.
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-sm">
                          <li>Follow staff instructions for safety, scheduling, and equipment handling.</li>
                          <li>No harassment, unsafe behavior, or intentional damage—this results in immediate removal.</li>
                        </ul>
                      </section>
                      
                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">4. Cancellations & Refunds (summary)</h2>
                        <p>
                          Reservations may be cancelled or rescheduled at least 2 hours prior without penalty.
                          Late cancellations or no-shows may incur a 50% booking fee.
                        </p>
                        <p>
                          Refunds for technical issues will be assessed case-by-case by management.
                        </p>
                        <p className="text-sm text-gray-400">
                          For full details, see the Refund Policy in the footer.
                        </p>
                      </section>

                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">5. Payments & Pricing</h2>
                        <p>
                          Payments may be collected online and/or at the venue depending on booking type. All prices shown are subject to applicable taxes
                          unless explicitly stated otherwise. Promotional pricing, coupons, and offers may have separate terms.
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-sm">
                          <li>We may require advance payment for peak slots or special events.</li>
                          <li>Chargebacks or fraudulent payments may lead to access restrictions.</li>
                        </ul>
                      </section>

                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">6. Safety & Liability</h2>
                        <p>
                          Play at your own discretion. While we maintain equipment and a safe environment, {BRAND_NAME} is not liable for loss or damage to
                          personal property. Use lockers/storage if provided and keep valuables with you.
                        </p>
                      </section>

                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">7. Contact</h2>
                        <p>
                          Questions about bookings, billing, or refunds? Reach us at <span className="text-white font-semibold">{SUPPORT_EMAIL}</span> or call
                          <span className="text-white font-semibold"> +91 93451 87098</span>.
                        </p>
                      </section>
                      
                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">8. Modifications</h2>
                        <p>
                          {BRAND_NAME} reserves the right to modify these terms at any time. Changes take effect immediately
                          upon posting. Continued use constitutes acceptance of modified terms.
                        </p>
                      </section>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={openDialog === "refunds"} onOpenChange={(open) => setOpenDialog(open ? "refunds" : null)}>
                  <Button variant="ghost" size="sm" className="footer-link justify-start" onClick={() => setOpenDialog("refunds")}>
                    Refund Policy
                  </Button>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-[#1a1a1a] to-[#1a0f1a] border-gamehaus-purple/40 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-white">Refund Policy</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 text-gray-300 mt-4">
                      <p className="text-xs text-gray-400">
                        Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                      </p>

                      <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">1. Eligibility</h2>
                        <p>
                          Refunds are typically considered for verified technical issues, duplicate payments, or booking errors that are clearly attributable to the
                          platform or venue operations.
                        </p>
                      </section>

                      <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">2. Cancellations</h2>
                        <ul className="list-disc pl-6 space-y-2 text-sm">
                          <li><span className="text-white font-semibold">2+ hours before slot:</span> cancellation/reschedule allowed without penalty (subject to payment gateway rules).</li>
                          <li><span className="text-white font-semibold">Less than 2 hours:</span> may incur up to a 50% booking fee due to slot blocking during peak schedules.</li>
                          <li><span className="text-white font-semibold">No-shows:</span> are generally non-refundable.</li>
                        </ul>
                      </section>

                      <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">3. Refund method & timelines</h2>
                        <p>
                          Approved refunds are processed back to the original payment method. Depending on your bank/payment provider, it may take
                          <span className="text-white font-semibold"> 3–10 business days</span> to reflect.
                        </p>
                      </section>

                      <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">4. Special cases</h2>
                        <ul className="list-disc pl-6 space-y-2 text-sm">
                          <li><span className="text-white font-semibold">Maintenance/safety closure:</span> if we cancel your slot, you’ll be offered a reschedule or refund.</li>
                          <li><span className="text-white font-semibold">Partial session:</span> if an issue occurs mid-session, credits/refunds may be prorated at management’s discretion.</li>
                          <li><span className="text-white font-semibold">Offers/coupons:</span> promotional discounts are non-cash and may not be refunded.</li>
                        </ul>
                      </section>

                      <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">5. How to request</h2>
                        <p>
                          Email <span className="text-white font-semibold">{SUPPORT_EMAIL}</span> with your booking details (name, phone, slot time, and payment reference). We respond as soon as possible.
                        </p>
                      </section>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={openDialog === "privacy"} onOpenChange={(open) => setOpenDialog(open ? "privacy" : null)}>
                  <Button variant="ghost" size="sm" className="footer-link justify-start" onClick={() => setOpenDialog("privacy")}>
                    Privacy Policy
                  </Button>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-[#1a1a1a] to-[#1a0f1a] border-gamehaus-purple/40 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-white">Privacy Policy</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 text-gray-300 mt-4">
                      <p className="text-xs text-gray-400">
                        Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                      </p>

                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">1. Information Collection</h2>
                        <p>
                          {BRAND_NAME} collects personal information including name, contact details,
                          and payment information when you register or reserve tables.
                        </p>
                        <p>
                          We collect usage data such as playing preferences, session duration, and purchase history
                          to improve services and customize your experience.
                        </p>
                      </section>
                      
                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">2. Information Usage</h2>
                        <p>We use collected information to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>Process reservations and payments</li>
                          <li>Personalize your club experience</li>
                          <li>Communicate services and promotions</li>
                          <li>Improve our facilities</li>
                          <li>Maintain security and prevent fraud</li>
                        </ul>
                      </section>
                      
                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">3. Information Sharing</h2>
                        <p>We do not sell or rent personal information. We may share with:</p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>Service providers assisting operations</li>
                          <li>Legal authorities when required</li>
                          <li>Partners with your consent</li>
                        </ul>
                      </section>

                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">4. Security & Retention</h2>
                        <p>
                          We use reasonable security measures to protect information. Access to operational systems is role-based. We retain data only as long as
                          needed for operational, legal, or security purposes.
                        </p>
                      </section>

                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">5. Cookies & Analytics</h2>
                        <p>
                          We may use cookies or similar technologies to keep sessions functional and improve performance. Third‑party tools may collect aggregated
                          usage metrics.
                        </p>
                      </section>
                      
                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">6. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>Access your information</li>
                          <li>Request corrections</li>
                          <li>Request deletion</li>
                          <li>Opt-out of marketing</li>
                          <li>Lodge complaints with authorities</li>
                        </ul>
                      </section>

                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">7. Contact</h2>
                        <p>
                          For privacy requests, contact <span className="text-white font-semibold">{SUPPORT_EMAIL}</span>.
                        </p>
                      </section>
                      
                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-gamehaus-lightpurple">8. Policy Changes</h2>
                        <p>
                          {BRAND_NAME} may update this policy anytime. Changes are posted on our website.
                          Continued use after modifications constitutes acceptance.
                        </p>
                      </section>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs tracking-[0.25em] text-gray-400">CONTACT</p>
              <div className="mt-4 space-y-3 text-sm text-gray-300">
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-gamehaus-lightpurple mt-0.5 shrink-0" />
                  <a href="tel:+919345187098" className="hover:text-gamehaus-lightpurple transition-colors">
                    +91 93451 87098
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-gamehaus-lightpurple mt-0.5 shrink-0" />
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-gamehaus-lightpurple transition-colors break-all">
                    {SUPPORT_EMAIL}
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-gamehaus-lightpurple mt-0.5 shrink-0" />
                  <span>Open daily</span>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gamehaus-lightpurple mt-0.5 shrink-0" />
                  <span className="leading-relaxed">
                    40, S W Boag Rd, CIT Nagar West, T. Nagar, Chennai, Tamil Nadu 600035
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-10 bg-gamehaus-purple/20" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="text-sm text-gray-400 text-center md:text-left">
              © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
            </div>

            <a
              href="https://cuephoriatech.in"
              target="_blank"
              rel="noreferrer"
              className="group cuephoria-fire-badge relative inline-flex items-center gap-2 rounded-full border border-gamehaus-purple/25 bg-black/55 px-3.5 py-1.5 backdrop-blur-sm transition-all duration-300 hover:border-gamehaus-pink/45 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-gamehaus-magenta/30"
              aria-label="Cuephoria Tech"
              title="Cuephoria Tech"
            >
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="absolute -inset-3 rounded-full bg-gradient-to-r from-gamehaus-magenta/35 via-gamehaus-pink/35 to-gamehaus-purple/35 blur-xl animate-fire-flicker" />
                <span className="absolute -inset-1 rounded-full bg-[radial-gradient(closest-side,rgba(255,193,74,0.25),transparent)] blur-lg opacity-70 animate-fire-flicker-slow" />
              </span>
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-gamehaus-purple/30 bg-gamehaus-purple/10">
                <span className="text-gamehaus-lightpurple font-bold tracking-tight">&lt;/&gt;</span>
              </span>
              <span className="text-[13px] font-semibold">
                <span className="text-gamehaus-lightpurple group-hover:text-gamehaus-pink transition-colors">Cuephoria</span>{" "}
                <span className="text-gray-200">Tech</span>
              </span>
              <span className="ml-0.5 inline-flex items-center justify-center h-7 w-7 rounded-full border border-gamehaus-purple/20 bg-black/40 text-gray-300 group-hover:text-white transition-colors">
                ↗
              </span>
            </a>
          </div>
        </div>
      </footer>
      
      {/* Elegant animated elements */}
      <div className="fixed top-[12%] left-[8%] text-gamehaus-lightpurple opacity-15 animate-float">
        <Trophy size={28} className="animate-wiggle" />
      </div>
      <div className="fixed bottom-[18%] right-[12%] text-gamehaus-magenta opacity-15 animate-float delay-300">
        <Sparkles size={26} className="animate-pulse-soft" />
      </div>
      <div className="fixed top-[35%] right-[8%] text-gamehaus-lightpurple opacity-15 animate-float delay-150">
        <Star size={24} className="animate-wiggle" />
      </div>
      <div className="fixed bottom-[30%] left-[15%] text-gamehaus-magenta opacity-15 animate-float delay-200">
        <Trophy size={22} className="animate-pulse-soft" />
      </div>
    </div>
  );
};

export default Index;
