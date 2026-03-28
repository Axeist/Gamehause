import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Booking {
  id: string;
  customer: {
    name: string;
  };
  /** When set, delete all underlying rows (staff merged view of contiguous slots). */
  mergedSourceBookings?: Array<{ id: string }>;
}

interface BookingDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onBookingDeleted: () => void;
}

export function BookingDeleteDialog({ open, onOpenChange, booking, onBookingDeleted }: BookingDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!booking) return;

    const ids =
      booking.mergedSourceBookings && booking.mergedSourceBookings.length > 0
        ? booking.mergedSourceBookings.map((b) => b.id)
        : [booking.id];

    setLoading(true);
    try {
      for (const bid of ids) {
        const { error: viewsError } = await supabase
          .from('booking_views')
          .delete()
          .eq('booking_id', bid);

        if (viewsError) {
          console.warn('Error deleting booking views:', viewsError);
        }

        const { error } = await supabase.from('bookings').delete().eq('id', bid);
        if (error) throw error;
      }

      toast.success(
        ids.length > 1 ? `Deleted ${ids.length} connected time segments` : 'Booking deleted successfully'
      );
      onBookingDeleted();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Booking</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the booking for {booking.customer.name}?
            {booking.mergedSourceBookings && booking.mergedSourceBookings.length > 1
              ? ` This removes ${booking.mergedSourceBookings.length} connected time segments shown as one block.`
              : ''}{' '}
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete Booking'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}