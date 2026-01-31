import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, Mail, CreditCard, Lock, Sparkles } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/lib/subscriptionPlans';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  requiredPlan?: string;
}

const UpgradeDialog: React.FC<UpgradeDialogProps> = ({ 
  open, 
  onOpenChange, 
  featureName,
  requiredPlan 
}) => {
  const navigate = useNavigate();

  const handleViewPlans = () => {
    navigate('/subscription');
  };

  const handleCloseAttempt = () => {
    // Redirect to subscription page on any close attempt
    navigate('/subscription');
  };

  const availablePlans = SUBSCRIPTION_PLANS.filter(plan => {
    if (featureName === 'Booking') {
      return plan.hasBookingAccess;
    }
    if (featureName === 'Staff Management') {
      return plan.hasStaffManagementAccess;
    }
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={handleCloseAttempt} modal={true}>
      <DialogContent 
        className="sm:max-w-[600px] bg-gradient-to-br from-gamehaus-darker via-black/85 to-gamehaus-darker border-gamehaus-purple/30 text-white [&>button]:hidden" 
        onPointerDownOutside={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }} 
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gamehaus-purple/30 to-gamehaus-magenta/30 flex items-center justify-center border border-gamehaus-purple/30">
              <Lock className="h-6 w-6 text-gamehaus-lightpurple" />
            </div>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gamehaus-lightpurple to-gamehaus-magenta bg-clip-text text-transparent">
              Upgrade Required
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-gray-300 text-base leading-relaxed">
            Your current subscription plan doesn't include access to <span className="font-semibold text-gamehaus-lightpurple">{featureName}</span>. 
            Please upgrade to a plan that includes this feature.
          </p>

          <div className="bg-gradient-to-br from-gamehaus-purple/10 via-gamehaus-magenta/5 to-gamehaus-purple/10 border border-gamehaus-purple/30 rounded-lg p-5 space-y-4">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gamehaus-lightpurple" />
              Available Plans
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availablePlans.map((plan) => (
                <div 
                  key={plan.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-white font-semibold">{plan.name}</p>
                    <p className="text-gray-400 text-sm">
                      {plan.type === 'lifetime' ? 'Lifetime' : `${plan.duration} Month${plan.duration > 1 ? 's' : ''}`}
                      {plan.discount && ` • ${plan.discount}% Savings`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gamehaus-lightpurple font-bold">₹{plan.finalPrice.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {availablePlans.some(p => p.id === 'lifetime') && (
            <div className="bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-yellow-400" />
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">Lifetime License Available</p>
                  <p className="text-gray-300 text-xs">
                    Contact Cuephoria Enterprise Team - <span className="font-semibold text-yellow-400">Krishna</span> at{' '}
                    <a href="tel:+918667857094" className="underline text-yellow-400 hover:text-yellow-300">
                      +91 86678 57094
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              onClick={handleViewPlans}
              className="w-full bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta hover:from-gamehaus-purple/90 hover:to-gamehaus-magenta/90 shadow-lg shadow-gamehaus-purple/20"
              size="lg"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              View Subscription Plans
            </Button>
            <p className="text-center text-xs text-gray-400 mt-3">
              Access to this feature requires an active subscription plan upgrade
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeDialog;

