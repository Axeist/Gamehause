
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';

const Terms: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-cuephoria-dark text-white flex flex-col">
      {/* Header */}
      <header className="h-20 flex items-center px-6 border-b border-gray-800 backdrop-blur-sm bg-cuephoria-dark/80">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-4 text-gray-400 hover:text-white" 
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo />
        </div>
      </header>
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Terms and Conditions</h1>
        
        <div className="space-y-8 text-gray-300">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Cuephoria's services, you agree to be bound by these Terms and Conditions. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">2. Membership and Gaming Sessions</h2>
            <p>
              Cuephoria provides gaming facilities and services on a pre-booking or walk-in basis, subject to availability.
              Members may receive preferential rates and privileges as communicated in our membership plans.
            </p>
            <p>
              All gaming sessions are charged according to our current rate card. Time extensions may be 
              subject to availability and additional charges.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">3. Conduct and Responsibilities</h2>
            <p>
              Users must maintain appropriate conduct within our premises. Cuephoria reserves the right to refuse service 
              to anyone engaging in disruptive, abusive, or inappropriate behavior.
            </p>
            <p>
              Users are responsible for any damage caused to equipment, furniture, or fixtures through improper use.
              Such damage may result in charges equivalent to repair or replacement costs.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">4. Refunds and Cancellations</h2>
            <p>
              Bookings may be cancelled or rescheduled at least 2 hours prior to the reserved time without penalty.
              Late cancellations or no-shows may be charged a fee equivalent to 50% of the booking amount.
            </p>
            <p>
              Refunds for technical issues or service interruptions will be assessed on a case-by-case basis by management.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">5. Modifications to Terms</h2>
            <p>
              Cuephoria reserves the right to modify these terms at any time. Changes will be effective immediately 
              upon posting on our website or premises. Continued use of our services constitutes acceptance of modified terms.
            </p>
          </section>
        </div>
        
        <div className="mt-12 flex justify-center">
          <Button 
            variant="outline"
            className="border-gray-700 text-white hover:bg-gray-800"
            onClick={() => navigate('/')}
          >
            Return to Home
          </Button>
        </div>
      </main>
      
      {/* Simple footer */}
      <footer className="py-6 border-t border-gray-800">
        <div className="text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Cuephoria. All rights reserved.</p>
          <p className="text-xs mt-1">Designed & Developed by Cuephoria Tech™</p>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
