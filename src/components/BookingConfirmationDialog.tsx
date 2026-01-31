import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Download, Share2, Copy, Calendar, Clock, MapPin, Tag, CreditCard, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { BASE_URL, BRAND_NAME } from '@/config/brand';

interface BookingConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: {
    bookingId: string;
    customerName: string;
    stationNames: string[];
    date: string;
    startTime: string;
    endTime: string;
    totalAmount: number;
    couponCode?: string;
    discountAmount?: number;
    paymentMode?: string;
    paymentTxnId?: string;
  };
}

export default function BookingConfirmationDialog({ 
  isOpen, 
  onClose, 
  bookingData 
}: BookingConfirmationDialogProps) {
  const handleSaveScreenshot = () => {
    toast.success('Please take a screenshot of this confirmation for your records');
  };

  const handleShare = async () => {
    const shareText = `🎮 Booking Confirmed at ${BRAND_NAME}! 

Booking ID: ${bookingData.bookingId}
Customer: ${bookingData.customerName}
Stations: ${bookingData.stationNames.join(', ')}
Date: ${format(new Date(bookingData.date), 'EEEE, MMMM d, yyyy')}
Time: ${bookingData.startTime} - ${bookingData.endTime}
Total Amount: ₹${bookingData.totalAmount}
${bookingData.paymentMode ? `Payment: ${bookingData.paymentMode === 'razorpay' ? 'Paid Online' : bookingData.paymentMode}` : 'Payment at venue'}
${bookingData.paymentTxnId ? `Transaction ID: ${bookingData.paymentTxnId}` : ''}
${bookingData.couponCode ? `Coupon Applied: ${bookingData.couponCode}` : ''}
${bookingData.discountAmount ? `Discount: ₹${bookingData.discountAmount}` : ''}

📍 ${BRAND_NAME} – Chennai's Premier Snooker & Gaming Lounge
📞 Contact: +91 93451 87098
🌐 Visit: ${BASE_URL}

Please arrive on time and show this confirmation at reception.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${BRAND_NAME} Booking Confirmation`,
          text: shareText,
        });
        toast.success('Booking details shared successfully!');
      } catch (error) {
        // User cancelled or error occurred - fallback to copy
        navigator.clipboard.writeText(shareText);
        toast.success('Booking details copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Booking details copied to clipboard!');
    }
  };

  const handleCopyBookingId = () => {
    navigator.clipboard.writeText(bookingData.bookingId);
    toast.success('Booking ID copied to clipboard!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[92vw] max-w-[380px] sm:max-w-md p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-[#09060c]/95 via-[#120816]/90 to-[#09060c]/95 border border-white/10 text-white shadow-2xl shadow-black/70 backdrop-blur-xl">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 sm:h-16 sm:w-16 bg-green-500/15 border border-green-400/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">
            Booking Confirmed!
          </DialogTitle>
        </DialogHeader>

        <Card className="bg-black/35 border-white/10">
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Booking ID */}
            <div className="text-center">
              <p className="text-sm text-gray-400/90 mb-1">Booking ID</p>
              <div className="flex items-center justify-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-gamehaus-purple/20 border-gamehaus-purple/30 text-gamehaus-lightpurple px-3 py-1 font-mono text-sm"
                >
                  {bookingData.bookingId}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyBookingId}
                  className="h-7 w-7 p-0 hover:bg-white/10"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Booking Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gamehaus-cyan" />
                <span className="text-sm text-gray-300">
                  {bookingData.stationNames.join(', ')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gamehaus-lightpurple" />
                <span className="text-sm text-gray-300">
                  {format(new Date(bookingData.date), 'EEEE, MMMM d, yyyy')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gamehaus-magenta" />
                <span className="text-sm text-gray-300">
                  {bookingData.startTime} - {bookingData.endTime}
                </span>
              </div>

              {bookingData.couponCode && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">
                    {bookingData.couponCode} Applied
                  </span>
                </div>
              )}
            </div>

            <Separator className="bg-white/10" />

            {/* Payment Information */}
            {bookingData.paymentMode && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-300">
                    Payment: <span className="font-semibold text-green-400">
                      {bookingData.paymentMode === 'razorpay' ? 'Paid Online ✓' : bookingData.paymentMode}
                    </span>
                  </span>
                </div>
                {bookingData.paymentTxnId && (
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gamehaus-cyan" />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs text-gray-400">Txn ID:</span>
                      <span className="text-xs font-mono text-gamehaus-cyan flex-1 truncate">
                        {bookingData.paymentTxnId}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(bookingData.paymentTxnId!);
                          toast.success('Transaction ID copied!');
                        }}
                        className="h-6 w-6 p-0 hover:bg-white/10"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator className="bg-white/10" />

            {/* Total Amount */}
            <div className="text-center">
              <p className="text-sm text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta">
                ₹{bookingData.totalAmount}
              </p>
              {!bookingData.paymentMode && (
                <p className="text-xs text-gray-400 mt-1">
                  Payment at venue
                </p>
              )}
              {bookingData.paymentMode === 'razorpay' && (
                <p className="text-xs text-green-400 mt-1 flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Payment completed
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleSaveScreenshot}
            className="w-full bg-white/5 hover:bg-white/10 border border-gamehaus-purple/30 text-gamehaus-lightpurple"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Save as Screenshot
          </Button>

          <Button
            onClick={handleShare}
            className="w-full bg-white/5 hover:bg-white/10 border border-gamehaus-cyan/30 text-gamehaus-cyan"
            variant="outline"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Confirmation
          </Button>

          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-gamehaus-purple via-gamehaus-magenta to-gamehaus-purple hover:opacity-95"
          >
            Close
          </Button>
        </div>

        <p className="text-[11px] leading-relaxed text-center text-gray-400/90">
          Please save this confirmation for your records. Show this at the reception when you arrive.
        </p>
      </DialogContent>
    </Dialog>
  );
}