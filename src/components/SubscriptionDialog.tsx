import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, Mail, XCircle, CreditCard } from 'lucide-react';

interface SubscriptionDialogProps {
  open: boolean;
}

const SubscriptionDialog: React.FC<SubscriptionDialogProps> = ({ open }) => {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/subscription');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose();
      }
    }} modal={true}>
      <DialogContent 
        className="sm:max-w-[500px] bg-gradient-to-br from-[#1A1F2C] via-[#1a1a2e] to-[#1A1F2C] border-red-500/30 text-white" 
        onPointerDownOutside={(e) => {
          e.preventDefault();
          handleClose();
        }} 
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleClose();
        }}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/30">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Access Denied
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-gray-300 text-base leading-relaxed">
            Your subscription has ended or been deactivated. Please contact the administrator to gain access to all features.
          </p>

          <div className="bg-gradient-to-br from-red-500/10 via-orange-500/5 to-red-500/10 border border-red-500/30 rounded-lg p-5 space-y-4 backdrop-blur-sm">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <Phone className="h-5 w-5 text-gamehaus-lightpurple" />
              Contact Administrator
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
                <div className="p-2 rounded-lg bg-gamehaus-purple/20">
                  <Phone className="h-5 w-5 text-gamehaus-lightpurple" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400">Cuephoria Tech Support</p>
                  <a
                    href="tel:+918667637565"
                    className="text-gamehaus-lightpurple hover:text-gamehaus-magenta font-semibold underline transition-colors"
                  >
                    Ranjith - +91 86676 37565
                  </a>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
                <div className="p-2 rounded-lg bg-gamehaus-purple/20">
                  <Mail className="h-5 w-5 text-gamehaus-lightpurple" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400">Email</p>
                  <a
                    href="mailto:contact@cuephoria.in"
                    className="text-gamehaus-lightpurple hover:text-gamehaus-magenta font-semibold underline transition-colors"
                  >
                    contact@cuephoria.in
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 border-gamehaus-purple/30 hover:bg-gamehaus-purple/10"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              View Subscription
            </Button>
            <Button
              onClick={() => {
                window.open(`tel:+918667637565`, '_self');
              }}
              className="flex-1 bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta hover:from-gamehaus-purple/90 hover:to-gamehaus-magenta/90"
              size="lg"
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionDialog;

