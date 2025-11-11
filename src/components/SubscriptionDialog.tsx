import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, Mail, XCircle } from 'lucide-react';

interface SubscriptionDialogProps {
  open: boolean;
}

const SubscriptionDialog: React.FC<SubscriptionDialogProps> = ({ open }) => {
  return (
    <Dialog open={open} modal={true}>
      <DialogContent 
        className="sm:max-w-[500px] bg-[#1A1F2C] border-red-500/30 text-white" 
        onPointerDownOutside={(e) => e.preventDefault()} 
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <DialogTitle className="text-2xl font-bold text-red-400">
              Subscription Ended or Deactivated
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-gray-300 text-base">
            Your subscription has ended or been deactivated. Please contact the administrator to gain access.
          </p>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3">
            <h3 className="text-white font-semibold">Contact Administrator</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-nerfturf-lightpurple" />
                <div>
                  <p className="text-sm text-gray-400">Cuephoria Tech Support</p>
                  <a
                    href="tel:+918667637565"
                    className="text-nerfturf-lightpurple hover:text-nerfturf-magenta font-semibold underline"
                  >
                    Ranjith - +91 86676 37565
                  </a>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-nerfturf-lightpurple" />
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <a
                    href="mailto:contact@cuephoria.in"
                    className="text-nerfturf-lightpurple hover:text-nerfturf-magenta font-semibold underline"
                  >
                    contact@cuephoria.in
                  </a>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              window.open(`tel:+918667637565`, '_self');
            }}
            className="w-full bg-gradient-to-r from-nerfturf-purple to-nerfturf-magenta hover:from-nerfturf-purple/90 hover:to-nerfturf-magenta/90"
            size="lg"
          >
            <Phone className="h-4 w-4 mr-2" />
            Call Administrator Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionDialog;

