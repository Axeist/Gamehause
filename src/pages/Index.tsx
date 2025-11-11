import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Monitor, Trophy, Users, Star, ShieldCheck, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Mail, Phone, Clock, MapPin } from 'lucide-react';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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
        <div className="absolute top-0 left-1/4 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-nerfturf-purple/10 to-transparent blur-[120px] animate-float opacity-30"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-nerfturf-magenta/10 to-transparent blur-[100px] animate-float opacity-30" style={{animationDelay: '3s'}}></div>
        
        {/* Subtle light streaks */}
        <div className="absolute top-[25%] w-full h-px bg-gradient-to-r from-transparent via-nerfturf-purple/15 to-transparent"></div>
        <div className="absolute top-[65%] w-full h-px bg-gradient-to-r from-transparent via-nerfturf-magenta/15 to-transparent"></div>
        
        {/* Elegant floating particles */}
        <div className="absolute w-2 h-2 bg-nerfturf-lightpurple/20 rounded-full top-1/4 left-1/4 animate-float"></div>
        <div className="absolute w-2 h-2 bg-nerfturf-magenta/20 rounded-full top-3/4 right-1/4 animate-float" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute w-2 h-2 bg-nerfturf-lightpurple/20 rounded-full top-1/2 left-3/4 animate-float" style={{animationDelay: '2.5s'}}></div>
        <div className="absolute w-1.5 h-1.5 bg-nerfturf-magenta/20 rounded-full top-1/3 right-1/3 animate-float" style={{animationDelay: '3.5s'}}></div>
      </div>

      {/* Header */}
      <header className="h-24 flex items-center px-8 border-b border-nerfturf-purple/30 relative z-10 backdrop-blur-md bg-black/40">
        <Logo />
        <div className="ml-auto space-x-4">
          <Button
            variant="outline"
            className="text-nerfturf-lightpurple border-nerfturf-purple/50 hover:bg-nerfturf-purple/30 hover:border-nerfturf-purple/70 transition-all duration-300"
            onClick={() => window.open('https://nerfturf.in', '_blank')}
          >
            Official Website
          </Button>
          <Button
            variant="default"
            className="bg-gradient-to-r from-nerfturf-purple to-nerfturf-magenta text-white hover:from-nerfturf-purple hover:to-nerfturf-magenta shadow-lg shadow-nerfturf-purple/50 transition-all duration-300"
            onClick={() => window.open('https://nerfturf.in/book', '_blank')}
          >
            Reserve Table
          </Button>
        </div>
      </header>

      {/* Hero section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative z-10">
        <div className="mb-10 animate-float-shadow">
          <div className="relative">
            <div className="absolute -inset-3 bg-gradient-to-r from-nerfturf-purple/30 to-nerfturf-magenta/30 rounded-full opacity-80 blur-2xl animate-pulse-glow"></div>
            <img
              src="https://freeimage.host/i/KpfrAog"
              alt="NerfTurf Logo" 
              className="h-36 md:h-44 relative z-10 drop-shadow-[0_0_20px_rgba(110, 89, 165, 0.6)]"
            />
          </div>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-center text-white font-heading leading-tight mb-6 tracking-tight">
          Welcome to{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-nerfturf-lightpurple via-nerfturf-magenta to-nerfturf-purple animate-text-gradient">
            NerfTurf
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-center text-nerfturf-lightpurple/80 max-w-3xl mb-4 font-light">
          Chennai's Premier Snooker & Gaming Lounge
        </p>
        
        <p className="text-lg text-center text-gray-300 max-w-2xl mb-12">
          Experience the elegance of professional snooker, pool tables, and PlayStation 5 gaming in a sophisticated, world-class setting.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Button
            size="lg"
            className="bg-gradient-to-r from-nerfturf-purple to-nerfturf-magenta text-white hover:from-nerfturf-purple hover:to-nerfturf-magenta shadow-xl shadow-nerfturf-purple/40 transition-all duration-300 text-lg px-8"
            onClick={() => navigate('/login')}
          >
            <ShieldCheck className="mr-2 h-5 w-5" />
            Member Login
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-nerfturf-lightpurple border-nerfturf-purple/60 hover:bg-nerfturf-purple/30 hover:border-nerfturf-lightpurple/80 group relative overflow-hidden transition-all duration-300 text-lg px-8"
            onClick={() => navigate('/public/stations')}
          >
            <div className="absolute inset-0 w-full bg-gradient-to-r from-nerfturf-purple/0 via-nerfturf-lightpurple/20 to-nerfturf-purple/0 animate-shimmer pointer-events-none"></div>
            <Monitor className="mr-2 h-5 w-5 animate-pulse-soft" />
            <span>View Table Availability</span>
          </Button>
        </div>
        
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mx-auto mb-20">
          <div className="bg-gradient-to-br from-black/60 to-nerfturf-purple/30 p-8 rounded-2xl border border-nerfturf-purple/40 hover:border-nerfturf-purple/60 transition-all duration-500 hover:shadow-2xl hover:shadow-nerfturf-purple/40 hover:-translate-y-2 group backdrop-blur-sm">
            <div className="flex items-center mb-5">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-nerfturf-purple/20 to-nerfturf-magenta/20 flex items-center justify-center text-nerfturf-lightpurple group-hover:scale-110 transition-transform duration-300 border border-nerfturf-purple/30">
                <Trophy size={24} />
              </div>
              <h3 className="ml-4 text-xl font-semibold text-white">Professional Tables</h3>
            </div>
            <p className="text-gray-300 leading-relaxed">Two medium snooker tables, one standard snooker table, and one American pool table, meticulously maintained for optimal play.</p>
          </div>
          
          <div className="bg-gradient-to-br from-black/60 to-nerfturf-purple/30 p-8 rounded-2xl border border-nerfturf-purple/40 hover:border-nerfturf-magenta/60 transition-all duration-500 hover:shadow-2xl hover:shadow-nerfturf-magenta/40 hover:-translate-y-2 group backdrop-blur-sm">
            <div className="flex items-center mb-5">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-nerfturf-magenta/20 to-nerfturf-purple/20 flex items-center justify-center text-nerfturf-magenta group-hover:scale-110 transition-transform duration-300 border border-nerfturf-magenta/30">
                <Sparkles size={24} />
              </div>
              <h3 className="ml-4 text-xl font-semibold text-white">Refined Ambiance</h3>
            </div>
            <p className="text-gray-300 leading-relaxed">Immerse yourself in our sophisticated lounge atmosphere, designed for serious players and enthusiasts alike.</p>
          </div>
          
          <div className="bg-gradient-to-br from-black/60 to-nerfturf-purple/30 p-8 rounded-2xl border border-nerfturf-purple/40 hover:border-nerfturf-purple/60 transition-all duration-500 hover:shadow-2xl hover:shadow-nerfturf-purple/40 hover:-translate-y-2 group backdrop-blur-sm">
            <div className="flex items-center mb-5">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-nerfturf-purple/20 to-nerfturf-magenta/20 flex items-center justify-center text-nerfturf-lightpurple group-hover:scale-110 transition-transform duration-300 border border-nerfturf-purple/30">
                <Users size={24} />
              </div>
              <h3 className="ml-4 text-xl font-semibold text-white">Elite Community</h3>
            </div>
            <p className="text-gray-300 leading-relaxed">Join our exclusive community of skilled players, participate in tournaments, and refine your game.</p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="w-full max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          <div className="text-center p-6 bg-gradient-to-br from-black/60 to-nerfturf-purple/30 backdrop-blur-md rounded-xl border border-nerfturf-purple/40 hover:border-nerfturf-purple/60 transition-all duration-300 hover:shadow-lg hover:shadow-nerfturf-purple/30">
            <Trophy className="h-8 w-8 text-nerfturf-lightpurple mx-auto mb-3" />
            <div className="text-3xl font-bold text-white">3</div>
            <div className="text-sm text-gray-300 mt-1">Snooker Tables</div>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-black/60 to-nerfturf-magenta/30 backdrop-blur-md rounded-xl border border-nerfturf-magenta/40 hover:border-nerfturf-magenta/60 transition-all duration-300 hover:shadow-lg hover:shadow-nerfturf-magenta/30">
            <Star className="h-8 w-8 text-nerfturf-magenta mx-auto mb-3" />
            <div className="text-3xl font-bold text-white">1</div>
            <div className="text-sm text-gray-300 mt-1">American Pool</div>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-black/60 to-nerfturf-purple/30 backdrop-blur-md rounded-xl border border-nerfturf-purple/40 hover:border-nerfturf-purple/60 transition-all duration-300 hover:shadow-lg hover:shadow-nerfturf-purple/30">
            <Users className="h-8 w-8 text-nerfturf-lightpurple mx-auto mb-3" />
            <div className="text-3xl font-bold text-white">2</div>
            <div className="text-sm text-gray-300 mt-1">PlayStation 5</div>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-black/60 to-nerfturf-magenta/30 backdrop-blur-md rounded-xl border border-nerfturf-magenta/40 hover:border-nerfturf-magenta/60 transition-all duration-300 hover:shadow-lg hover:shadow-nerfturf-magenta/30">
            <Sparkles className="h-8 w-8 text-nerfturf-magenta mx-auto mb-3" />
            <div className="text-3xl font-bold text-white">Premium</div>
            <div className="text-sm text-gray-300 mt-1">Experience</div>
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="w-full max-w-5xl mx-auto bg-gradient-to-br from-black/70 via-nerfturf-purple/40 to-black/70 border border-nerfturf-purple/50 rounded-3xl p-12 relative overflow-hidden backdrop-blur-md">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="absolute top-0 right-0 h-80 w-80 bg-nerfturf-purple/10 blur-3xl rounded-full"></div>
          <div className="absolute bottom-0 left-0 h-80 w-80 bg-nerfturf-magenta/10 blur-3xl rounded-full"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-6 tracking-tight">Ready to Experience NerfTurf?</h2>
            <p className="text-center text-gray-300 mb-10 max-w-2xl mx-auto text-lg leading-relaxed">
              Step into Chennai's most sophisticated snooker, pool, and gaming venue. Reserve your table and experience excellence.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Button
                size="lg"
                className="bg-gradient-to-r from-nerfturf-purple to-nerfturf-magenta text-white hover:from-nerfturf-purple hover:to-nerfturf-magenta shadow-xl group transition-all duration-300 text-lg px-8"
                onClick={() => navigate('/login')}
              >
                <ShieldCheck className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Member Access
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-nerfturf-lightpurple border-nerfturf-purple/60 hover:bg-nerfturf-purple/30 hover:border-nerfturf-lightpurple/80 transition-all duration-300 text-lg px-8"
                onClick={() => navigate('/public/stations')}
              >
                <Monitor className="mr-2 h-5 w-5" />
                View Tables
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-nerfturf-purple/30 relative z-10 mt-auto backdrop-blur-sm bg-black/30">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <div className="flex items-center mb-6 md:mb-0">
              <Logo size="sm" />
              <span className="ml-3 text-gray-400">© {new Date().getFullYear()} NerfTurf. All rights reserved.</span>
            </div>
            
            <div className="flex space-x-6">
              <Dialog open={openDialog === 'terms'} onOpenChange={(open) => setOpenDialog(open ? 'terms' : null)}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-nerfturf-lightpurple transition-colors"
                  onClick={() => setOpenDialog('terms')}
                >
                  Terms
                </Button>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-[#1a1a1a] to-[#1a0f1a] border-nerfturf-purple/40 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white">Terms and Conditions</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 text-gray-300 mt-4">
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-nerfturf-lightpurple">1. Acceptance of Terms</h2>
                      <p>
                        By accessing and using NerfTurf's services, you agree to be bound by these Terms and Conditions. 
                        If you do not agree to these terms, please do not use our services.
                      </p>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-nerfturf-lightpurple">2. Table Reservations</h2>
                      <p>
                        NerfTurf provides snooker and 8-ball pool facilities on a reservation or walk-in basis, subject to availability.
                        Members receive preferential rates and booking privileges.
                      </p>
                      <p>
                        All sessions are charged according to our current rate card. Extensions are subject to availability and additional charges.
                      </p>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-nerfturf-lightpurple">3. Club Conduct</h2>
                      <p>
                        Members and guests must maintain appropriate conduct within our premises. NerfTurf reserves the right to refuse service 
                        to anyone engaging in disruptive, abusive, or inappropriate behavior.
                      </p>
                      <p>
                        Players are responsible for any damage caused to equipment, tables, or fixtures through improper use.
                        Damages will be charged at repair or replacement cost.
                      </p>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-nerfturf-lightpurple">4. Cancellations and Refunds</h2>
                      <p>
                        Reservations may be cancelled or rescheduled at least 2 hours prior without penalty.
                        Late cancellations or no-shows may incur a 50% booking fee.
                      </p>
                      <p>
                        Refunds for technical issues will be assessed case-by-case by management.
                      </p>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-nerfturf-lightpurple">5. Modifications</h2>
                      <p>
                        NerfTurf reserves the right to modify these terms at any time. Changes take effect immediately 
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
                  className="text-gray-400 hover:text-nerfturf-lightpurple transition-colors"
                  onClick={() => setOpenDialog('privacy')}
                >
                  Privacy
                </Button>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-[#1a1a1a] to-[#1a0f1a] border-nerfturf-purple/40 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white">Privacy Policy</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 text-gray-300 mt-4">
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-nerfturf-lightpurple">1. Information Collection</h2>
                      <p>
                        NerfTurf collects personal information including name, contact details, 
                        and payment information when you register or reserve tables.
                      </p>
                      <p>
                        We collect usage data such as playing preferences, session duration, and purchase history 
                        to improve services and customize your experience.
                      </p>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-nerfturf-lightpurple">2. Information Usage</h2>
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
                      <h2 className="text-lg font-semibold text-nerfturf-lightpurple">3. Information Sharing</h2>
                      <p>We do not sell or rent personal information. We may share with:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Service providers assisting operations</li>
                        <li>Legal authorities when required</li>
                        <li>Partners with your consent</li>
                      </ul>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-nerfturf-lightpurple">4. Your Rights</h2>
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
                      <h2 className="text-lg font-semibold text-nerfturf-lightpurple">5. Policy Changes</h2>
                      <p>
                        NerfTurf may update this policy anytime. Changes are posted on our website. 
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
                    className="text-gray-400 hover:text-nerfturf-lightpurple transition-colors"
                  >
                    Contact
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-gradient-to-br from-[#1a1a1a] to-[#1a0f1a] border-nerfturf-purple/40 text-white p-5 backdrop-blur-md">
                  <h3 className="font-semibold text-lg mb-4 text-nerfturf-lightpurple">Contact Us</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-nerfturf-lightpurple mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">Phone</p>
                        <a href="tel:+919345187098" className="text-gray-300 text-sm hover:text-nerfturf-lightpurple transition-colors">
                          +91 93451 87098
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-nerfturf-magenta mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">Email</p>
                        <a href="mailto:contact@nerfturf.in" className="text-gray-300 text-sm hover:text-nerfturf-magenta transition-colors">
                          contact@nerfturf.in
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Clock className="h-5 w-5 text-nerfturf-lightpurple mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">Hours</p>
                        <span className="text-gray-300 text-sm">Open Daily</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-nerfturf-magenta mr-3 mt-0.5" />
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
                <Phone className="h-3 w-3 text-nerfturf-purple" />
                <a href="tel:+919345187098" className="hover:text-nerfturf-lightpurple transition-colors">+91 93451 87098</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-nerfturf-purple" />
                <a href="mailto:contact@nerfturf.in" className="hover:text-nerfturf-lightpurple transition-colors">contact@nerfturf.in</a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-nerfturf-purple" />
                <span>40, S W Boag Rd, T. Nagar, Chennai</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Elegant animated elements */}
      <div className="fixed top-[12%] left-[8%] text-nerfturf-lightpurple opacity-15 animate-float">
        <Trophy size={28} className="animate-wiggle" />
      </div>
      <div className="fixed bottom-[18%] right-[12%] text-nerfturf-magenta opacity-15 animate-float delay-300">
        <Sparkles size={26} className="animate-pulse-soft" />
      </div>
      <div className="fixed top-[35%] right-[8%] text-nerfturf-lightpurple opacity-15 animate-float delay-150">
        <Star size={24} className="animate-wiggle" />
      </div>
      <div className="fixed bottom-[30%] left-[15%] text-nerfturf-magenta opacity-15 animate-float delay-200">
        <Trophy size={22} className="animate-pulse-soft" />
      </div>
    </div>
  );
};

export default Index;
