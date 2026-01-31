import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Monitor, Trophy, Users, Star, ShieldCheck, Sparkles, Calendar, LogIn, Gamepad2, Timer, Headset, Radio, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Mail, Phone, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { BRAND_NAME, LOGO_PATH, PUBLIC_BOOKING_URL, SUPPORT_EMAIL } from '@/config/brand';

interface Station {
  id: string;
  name: string;
  type: 'ps5' | '8ball' | 'vr';
  hourly_rate: number;
  is_occupied: boolean;
}

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

  // Fetch live station data
  useEffect(() => {
    const fetchLiveStations = async () => {
      try {
        const { data, error } = await supabase
          .from('stations')
          .select('*')
          .order('name');
        
        if (error) throw error;
        setLiveStations(data || []);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#1a0f1a] to-[#1a1a1a] flex flex-col relative overflow-hidden">
      {/* Elegant animated background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Luxury grid pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{ 
            backgroundImage: 'linear-gradient(to right, rgb(110, 89, 165) 1px, transparent 1px), linear-gradient(to bottom, rgb(110, 89, 165) 1px, transparent 1px)',
            backgroundSize: '60px 60px' 
          }}>
        </div>
        
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
              className="h-28 sm:h-32 md:h-36 lg:h-44 relative z-10 drop-shadow-[0_0_20px_rgba(255,74,26,0.6)]"
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
          Experience the elegance of professional snooker, pool tables, and PlayStation 5 gaming in a sophisticated, world-class setting.
        </p>
        
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
            Click above to book your snooker table, pool table, or PlayStation 5 gaming session
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
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin-slow h-8 w-8 rounded-full border-4 border-gamehaus-purple border-t-transparent"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveStations.map((station) => {
                    const isPS5 = station.type === 'ps5';
                    const isPool = station.type === '8ball';
                    const isVR = station.type === 'vr';
                    
                    return (
                      <div
                        key={station.id}
                        className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                          station.is_occupied
                            ? 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-red-500/10 border-red-500/40'
                            : 'bg-gradient-to-br from-green-500/10 via-green-500/5 to-green-500/10 border-green-500/40'
                        } hover:scale-[1.02] hover:shadow-xl`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        
                        <div className="p-5 relative z-10">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-lg ${
                                isPS5 ? 'bg-blue-500/20 border border-blue-500/30' :
                                isPool ? 'bg-amber-500/20 border border-amber-500/30' :
                                'bg-purple-500/20 border border-purple-500/30'
                              }`}>
                                {isPS5 ? (
                                  <Gamepad2 className={`h-5 w-5 ${isPS5 ? 'text-blue-400' : ''}`} />
                                ) : isPool ? (
                                  <Timer className="h-5 w-5 text-amber-400" />
                                ) : (
                                  <Headset className="h-5 w-5 text-purple-400" />
                                )}
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-white">{station.name}</h3>
                                <p className="text-xs text-gray-400 capitalize">{station.type === '8ball' ? 'Pool Table' : station.type === 'ps5' ? 'PlayStation 5' : 'VR Station'}</p>
                              </div>
                            </div>
                            <Badge className={
                              station.is_occupied
                                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                : 'bg-green-500/20 text-green-300 border-green-500/30 animate-pulse-soft'
                            }>
                              {station.is_occupied ? (
                                <XCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              )}
                              {station.is_occupied ? 'Occupied' : 'Available'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t border-white/10">
                            <span className="text-gray-400 text-sm">Rate:</span>
                            <span className="text-white font-bold text-lg">
                              ₹{station.hourly_rate}/hr
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                  <span>3 Premium Snooker Tables</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>1 American Pool Table</span>
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
            <div className="text-3xl font-bold text-white">3</div>
            <div className="text-sm text-gray-300 mt-1">Snooker Tables</div>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-black/60 to-gamehaus-magenta/30 backdrop-blur-md rounded-xl border border-gamehaus-magenta/40 hover:border-gamehaus-magenta/60 transition-all duration-300 hover:shadow-lg hover:shadow-gamehaus-magenta/30">
            <Star className="h-8 w-8 text-gamehaus-magenta mx-auto mb-3" />
            <div className="text-3xl font-bold text-white">1</div>
            <div className="text-sm text-gray-300 mt-1">American Pool</div>
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
      <footer className="py-10 border-t border-gamehaus-purple/30 relative z-10 mt-auto backdrop-blur-sm bg-black/30">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <div className="flex items-center mb-6 md:mb-0">
              <Logo size="sm" />
              <span className="ml-3 text-gray-400">© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</span>
            </div>
            
            <div className="flex space-x-6">
              <Dialog open={openDialog === 'terms'} onOpenChange={(open) => setOpenDialog(open ? 'terms' : null)}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-gamehaus-lightpurple transition-colors"
                  onClick={() => setOpenDialog('terms')}
                >
                  Terms
                </Button>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-[#1a1a1a] to-[#1a0f1a] border-gamehaus-purple/40 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white">Terms and Conditions</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 text-gray-300 mt-4">
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
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-gamehaus-lightpurple">4. Cancellations and Refunds</h2>
                      <p>
                        Reservations may be cancelled or rescheduled at least 2 hours prior without penalty.
                        Late cancellations or no-shows may incur a 50% booking fee.
                      </p>
                      <p>
                        Refunds for technical issues will be assessed case-by-case by management.
                      </p>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-gamehaus-lightpurple">5. Modifications</h2>
                      <p>
                        {BRAND_NAME} reserves the right to modify these terms at any time. Changes take effect immediately 
                        upon posting. Continued use constitutes acceptance of modified terms.
                      </p>
                    </section>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={openDialog === 'privacy'} onOpenChange={(open) => setOpenDialog(open ? 'privacy' : null)}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-gamehaus-lightpurple transition-colors"
                  onClick={() => setOpenDialog('privacy')}
                >
                  Privacy
                </Button>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-[#1a1a1a] to-[#1a0f1a] border-gamehaus-purple/40 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white">Privacy Policy</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 text-gray-300 mt-4">
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
                      <h2 className="text-lg font-semibold text-gamehaus-lightpurple">4. Your Rights</h2>
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
                      <h2 className="text-lg font-semibold text-gamehaus-lightpurple">5. Policy Changes</h2>
                      <p>
                        {BRAND_NAME} may update this policy anytime. Changes are posted on our website. 
                        Continued use after modifications constitutes acceptance.
                      </p>
                    </section>
                  </div>
                </DialogContent>
              </Dialog>

              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-gamehaus-lightpurple transition-colors"
                  >
                    Contact
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-gradient-to-br from-[#1a1a1a] to-[#1a0f1a] border-gamehaus-purple/40 text-white p-5 backdrop-blur-md">
                  <h3 className="font-semibold text-lg mb-4 text-gamehaus-lightpurple">Contact Us</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-gamehaus-lightpurple mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">Phone</p>
                        <a href="tel:+919345187098" className="text-gray-300 text-sm hover:text-gamehaus-lightpurple transition-colors">
                          +91 93451 87098
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-gamehaus-magenta mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">Email</p>
                        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gray-300 text-sm hover:text-gamehaus-magenta transition-colors">
                          {SUPPORT_EMAIL}
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Clock className="h-5 w-5 text-gamehaus-lightpurple mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">Hours</p>
                        <span className="text-gray-300 text-sm">Open Daily</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gamehaus-magenta mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">Location</p>
                        <span className="text-gray-300 text-sm leading-relaxed">
                          40, S W Boag Rd, CIT Nagar West,<br />
                          T. Nagar, Chennai,<br />
                          Tamil Nadu 600035
                        </span>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="text-xs text-center text-gray-500">
            <p className="mb-2 text-gray-400">Designed & Developed by Cuephoria Tech<sup>™</sup></p>
            <div className="flex flex-col md:flex-row justify-center items-center gap-6 text-gray-400">
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-gamehaus-purple" />
                <a href="tel:+919345187098" className="hover:text-gamehaus-lightpurple transition-colors">+91 93451 87098</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-gamehaus-purple" />
                <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-gamehaus-lightpurple transition-colors">{SUPPORT_EMAIL}</a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-gamehaus-purple" />
                <span>40, S W Boag Rd, T. Nagar, Chennai</span>
              </div>
            </div>
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
