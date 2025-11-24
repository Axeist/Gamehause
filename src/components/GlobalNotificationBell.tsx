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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] max-w-[calc(100vw-2rem)] p-0" align="end">
        <div className="flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Booking Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-[20px] text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
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
                  className="h-8 text-xs"
                  onClick={markAllAsRead}
                >
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-red-500 hover:text-red-600"
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
                <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  New bookings will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => {
                  const { booking, isPaid, isRead, timestamp } = notification;
                  const isUnread = !isRead;

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 transition-colors cursor-pointer hover:bg-accent ${
                        isUnread
                          ? isPaid
                            ? 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-l-4 border-blue-500'
                            : 'bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500'
                          : isPaid
                          ? 'bg-green-50/50 dark:bg-green-950/10'
                          : ''
                      }`}
                      onClick={() => !isRead && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {isPaid ? (
                            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm truncate">
                                  {booking.customer.name}
                                </p>
                                {isPaid && (
                                  <Badge
                                    variant="outline"
                                    className="h-5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700"
                                  >
                                    Paid
                                  </Badge>
                                )}
                                {isUnread && (
                                  <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {booking.station.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatBookingTime(booking.booking_date, booking.start_time)}
                              </p>
                              {booking.final_price && (
                                <p className="text-xs font-medium text-muted-foreground mt-1">
                                  Amount: {formatAmount(booking.final_price)}
                                </p>
                              )}
                              {isPaid && booking.payment_mode && booking.payment_txn_id && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {booking.payment_mode} • {booking.payment_txn_id.slice(0, 8)}...
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
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
              <Separator />
              <div className="p-2 text-center">
                <p className="text-xs text-muted-foreground">
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

