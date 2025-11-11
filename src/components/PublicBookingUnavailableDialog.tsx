import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, Info } from 'lucide-react';

interface PublicBookingUnavailableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PublicBookingUnavailableDialog: React.FC<PublicBookingUnavailableDialogProps> = ({ 
  open, 
  onOpenChange 
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent 
        className="sm:max-w-[450px] bg-gradient-to-br from-[#1A1F2C] via-[#1a1a2e] to-[#1A1F2C] border-nerfturf-purple/30 text-white" 
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-nerfturf-purple/20 flex items-center justify-center border border-nerfturf-purple/30">
              <Info className="h-5 w-5 text-nerfturf-lightpurple" />
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              Booking Services Unavailable
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-gray-300 text-sm leading-relaxed">
            Online booking services are currently unavailable. Please reach out to NerfTurf directly for booking assistance.
          </p>

          <div className="bg-nerfturf-purple/10 border border-nerfturf-purple/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-nerfturf-lightpurple" />
              <div>
                <p className="text-gray-400 text-xs mb-1">Contact NerfTurf</p>
                <a
                  href="tel:+919345187098"
                  className="text-nerfturf-lightpurple hover:text-nerfturf-magenta font-semibold text-base underline transition-colors"
                >
                  +91 93451 87098
                </a>
              </div>
            </div>
          </div>

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-gradient-to-r from-nerfturf-purple to-nerfturf-magenta hover:from-nerfturf-purple/90 hover:to-nerfturf-magenta/90"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PublicBookingUnavailableDialog;

