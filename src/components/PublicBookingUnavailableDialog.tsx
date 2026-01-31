import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Phone, Info, Calendar, Clock, MapPin } from 'lucide-react';
import { BRAND_NAME } from '@/config/brand';

interface PublicBookingUnavailableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PublicBookingUnavailableDialog: React.FC<PublicBookingUnavailableDialogProps> = ({ 
  open, 
  onOpenChange 
}) => {
  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        // Prevent closing - always keep it open
        if (!isOpen) {
          // Do nothing - dialog stays open
        }
      }} 
      modal={true}
    >
      <DialogContent 
        className="sm:max-w-[500px] bg-gradient-to-br from-gamehaus-darker via-black/85 to-gamehaus-darker border-gamehaus-purple/40 text-white [&>button]:hidden" 
        onPointerDownOutside={(e) => e.preventDefault()} 
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-gamehaus-purple/30 to-gamehaus-magenta/30 flex items-center justify-center border-2 border-gamehaus-purple/50 shadow-lg shadow-gamehaus-purple/30">
              <Info className="h-7 w-7 text-gamehaus-lightpurple" />
            </div>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gamehaus-lightpurple to-gamehaus-magenta bg-clip-text text-transparent">
              Booking Services Unavailable
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          <div className="p-4 rounded-xl bg-gradient-to-r from-gamehaus-purple/10 via-gamehaus-magenta/5 to-gamehaus-purple/10 border border-gamehaus-purple/30">
            <p className="text-gray-200 text-base leading-relaxed font-medium">
              Online booking services are currently unavailable. Please reach out to <span className="font-bold text-gamehaus-lightpurple">{BRAND_NAME}</span> directly for booking assistance.
            </p>
          </div>

          <div className="bg-gradient-to-br from-gamehaus-purple/15 via-gamehaus-magenta/10 to-gamehaus-purple/15 border-2 border-gamehaus-purple/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-gamehaus-purple/20">
                <Phone className="h-5 w-5 text-gamehaus-lightpurple" />
              </div>
              <h3 className="text-white font-bold text-lg">Contact {BRAND_NAME}</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-black/30 hover:bg-black/40 transition-colors border border-gamehaus-purple/20">
                <Phone className="h-5 w-5 text-gamehaus-lightpurple flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-gray-400 text-xs mb-1">Call us for bookings</p>
                  <a
                    href="tel:+919345187098"
                    className="text-gamehaus-lightpurple hover:text-gamehaus-magenta font-bold text-lg underline transition-colors flex items-center gap-2"
                  >
                    +91 93451 87098
                    <span className="text-xs text-gray-400">(Tap to call)</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 rounded-lg bg-black/20 border border-gamehaus-purple/20">
                  <Calendar className="h-4 w-4 text-gamehaus-lightpurple mb-1" />
                  <p className="text-gray-400 text-xs">Walk-in Available</p>
                  <p className="text-white text-sm font-semibold">Visit Us</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-gamehaus-purple/20">
                  <Clock className="h-4 w-4 text-gamehaus-lightpurple mb-1" />
                  <p className="text-gray-400 text-xs">Business Hours</p>
                  <p className="text-white text-sm font-semibold">Call for Info</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gradient-to-r from-gamehaus-purple/10 to-gamehaus-magenta/10 border border-gamehaus-purple/30">
            <p className="text-gray-300 text-sm text-center leading-relaxed">
              <span className="font-semibold text-white">We're here to help!</span> Our team is ready to assist you with your gaming session bookings. 
              Give us a call or visit our venue for immediate assistance.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PublicBookingUnavailableDialog;
