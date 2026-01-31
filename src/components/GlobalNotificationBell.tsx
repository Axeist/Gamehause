// src/components/GlobalNotificationBell.tsx
import React from 'react';
import { Bell, X, CheckCircle2, DollarSign, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useBookingNotifications } from '@/context/BookingNotificationContext';
import { format, formatDistanceToNow } from 'date-fns';

const GlobalNotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
  } = useBookingNotifications();

  const formatBookingTime = (bookingDate: string, startTime: string) => {
    try {
      const date = new Date(bookingDate);
      const formattedDate = format(date, 'MMM dd, yyyy');
      return `${formattedDate} • ${startTime}`;
    } catch {
      return `${bookingDate} • ${startTime}`;
    }
  };

  const formatAmount = (amount: number | null | undefined) => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white hover:text-gamehaus-lightpurple">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] max-w-[calc(100vw-2rem)] p-0 bg-gamehaus-darker border-gamehaus-purple/20 text-white" align="end">
        <div className="flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gamehaus-purple/20">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-white">Booking Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-[20px] text-xs bg-red-500 text-white">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:text-gamehaus-lightpurple hover:bg-gamehaus-purple/20"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Disable sound' : 'Enable sound'}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-white hover:text-gamehaus-lightpurple hover:bg-gamehaus-purple/20"
                  onClick={markAllAsRead}
                >
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  onClick={clearAllNotifications}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <ScrollArea className="flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Bell className="h-12 w-12 text-gamehaus-purple/50 mb-4" />
                <p className="text-sm text-gamehaus-lightpurple/70">No notifications yet</p>
                <p className="text-xs text-gamehaus-lightpurple/50 mt-1">
                  New bookings will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gamehaus-purple/20">
                {notifications.map((notification) => {
                  const { booking, isPaid, isRead, timestamp } = notification;
                  const isUnread = !isRead;

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 transition-colors cursor-pointer ${
                        isUnread
                          ? isPaid
                            ? 'bg-gradient-to-r from-green-900/30 to-blue-900/30 border-l-4 border-gamehaus-purple hover:bg-gamehaus-purple/20'
                            : 'bg-gamehaus-purple/10 border-l-4 border-gamehaus-purple hover:bg-gamehaus-purple/20'
                          : isPaid
                          ? 'bg-green-900/10 hover:bg-gamehaus-purple/10'
                          : 'hover:bg-gamehaus-purple/10'
                      }`}
                      onClick={() => !isRead && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {isPaid ? (
                            <DollarSign className="h-5 w-5 text-green-400" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-gamehaus-lightpurple" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm truncate text-white">
                                  {booking.customer.name}
                                </p>
                                {isPaid && (
                                  <Badge
                                    variant="outline"
                                    className="h-5 text-xs bg-green-900/40 text-green-300 border-green-600"
                                  >
                                    Paid
                                  </Badge>
                                )}
                                {isUnread && (
                                  <span className="h-2 w-2 rounded-full bg-gamehaus-lightpurple flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-gamehaus-lightpurple/80">
                                {booking.station.name}
                              </p>
                              <p className="text-xs text-gamehaus-lightpurple/80">
                                {formatBookingTime(booking.booking_date, booking.start_time)}
                              </p>
                              {booking.final_price && (
                                <p className="text-xs font-medium text-gamehaus-lightpurple mt-1">
                                  Amount: {formatAmount(booking.final_price)}
                                </p>
                              )}
                              {isPaid && booking.payment_mode && booking.payment_txn_id && (
                                <p className="text-xs text-gamehaus-lightpurple/70 mt-1">
                                  {booking.payment_mode} • {booking.payment_txn_id.slice(0, 8)}...
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0 text-white hover:text-red-400 hover:bg-red-500/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-gamehaus-lightpurple/60 mt-2">
                            {formatDistanceToNow(timestamp, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <>
              <Separator className="bg-gamehaus-purple/20" />
              <div className="p-2 text-center">
                <p className="text-xs text-gamehaus-lightpurple/70">
                  {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                </p>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default GlobalNotificationBell;

