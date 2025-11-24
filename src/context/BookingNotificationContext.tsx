// src/context/BookingNotificationContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Booking interface matching the schema
interface BookingView {
  id: string;
  booking_id: string;
  access_code: string;
  created_at: string;
  last_accessed_at?: string;
}

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes?: string | null;
  original_price?: number | null;
  final_price?: number | null;
  discount_percentage?: number | null;
  coupon_code?: string | null;
  booking_group_id?: string | null;
  status_updated_at?: string | null;
  status_updated_by?: string | null;
  payment_mode?: string | null;
  payment_txn_id?: string | null;
  station_id: string;
  customer_id: string;
  created_at?: string;
  station: {
    id: string;
    name: string;
    type: string;
  };
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    created_at?: string;
  };
  booking_views?: BookingView[];
}

export interface BookingNotification {
  id: string;
  booking: Booking;
  timestamp: Date;
  isPaid: boolean;
  isRead?: boolean;
}

interface BookingNotificationContextType {
  notifications: BookingNotification[];
  unreadCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAllNotifications: () => void;
}

const BookingNotificationContext = createContext<BookingNotificationContextType | undefined>(undefined);

const STORAGE_KEY_NOTIFICATIONS = 'booking-notifications';
const STORAGE_KEY_PREVIOUS_IDS = 'booking-previous-ids';
const STORAGE_KEY_SOUND_ENABLED = 'booking-sound-enabled';

// Play notification sound using Web Audio API
const playNotificationSound = (isPaid: boolean) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for paid vs unpaid
    oscillator.frequency.value = isPaid ? 1000 : 600; // Hz
    oscillator.type = 'sine';

    // Fade out effect
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3); // 300ms duration
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

export const BookingNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const [previousBookingIds, setPreviousBookingIds] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const previousBookingIdsRef = useRef<Set<string>>(new Set());
  const subscriptionRef = useRef<any>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      // Load notifications
      const storedNotifications = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      if (storedNotifications) {
        const parsed = JSON.parse(storedNotifications);
        // Filter to last 24 hours and convert timestamps
        const now = new Date();
        const filtered = parsed
          .map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
            booking: {
              ...n.booking,
              booking_date: n.booking.booking_date,
            },
          }))
          .filter((n: BookingNotification) => {
            const hoursDiff = (now.getTime() - n.timestamp.getTime()) / (1000 * 60 * 60);
            return hoursDiff <= 24;
          });
        setNotifications(filtered);
      }

      // Load previous booking IDs
      const storedIds = localStorage.getItem(STORAGE_KEY_PREVIOUS_IDS);
      if (storedIds) {
        const parsed = JSON.parse(storedIds);
        const idSet = new Set(parsed);
        setPreviousBookingIds(idSet);
        previousBookingIdsRef.current = idSet;
      }

      // Load sound preference
      const storedSound = localStorage.getItem(STORAGE_KEY_SOUND_ENABLED);
      if (storedSound !== null) {
        setSoundEnabledState(JSON.parse(storedSound));
      }
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
    }
  }, []);

  // Load existing bookings to seed previousBookingIds
  useEffect(() => {
    const loadExistingBookings = async () => {
      try {
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(100); // Load last 100 bookings

        if (error) {
          console.error('Error loading existing bookings:', error);
          return;
        }

        if (bookings && bookings.length > 0) {
          const idSet = new Set(bookings.map(b => b.id));
          setPreviousBookingIds(prev => {
            const merged = new Set([...prev, ...idSet]);
            previousBookingIdsRef.current = merged;
            localStorage.setItem(STORAGE_KEY_PREVIOUS_IDS, JSON.stringify([...merged]));
            return merged;
          });
        }
      } catch (error) {
        console.error('Error in loadExistingBookings:', error);
      }
    };

    loadExistingBookings();
  }, []);

  // Save to localStorage whenever notifications change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }, [notifications]);

  // Save sound preference
  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_SOUND_ENABLED, JSON.stringify(enabled));
    } catch (error) {
      console.error('Error saving sound preference:', error);
    }
  }, []);

  // Fetch booking details with relationships
  const fetchBookingDetails = async (bookingId: string): Promise<Booking | null> => {
    try {
      // Fetch booking with relationships
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id, booking_date, start_time, end_time, duration, status,
          notes, original_price, final_price, discount_percentage,
          coupon_code, booking_group_id, status_updated_at,
          status_updated_by, payment_mode, payment_txn_id,
          station_id, customer_id, created_at
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError || !bookingData) {
        console.error('Error fetching booking:', bookingError);
        return null;
      }

      // Fetch station and customer details in parallel
      const [{ data: stationData, error: stationError }, { data: customerData, error: customerError }] = await Promise.all([
        supabase
          .from('stations')
          .select('id, name, type')
          .eq('id', bookingData.station_id)
          .single(),
        supabase
          .from('customers')
          .select('id, name, phone, email, created_at')
          .eq('id', bookingData.customer_id)
          .single(),
      ]);

      if (stationError || !stationData) {
        console.error('Error fetching station:', stationError);
        return null;
      }

      if (customerError || !customerData) {
        console.error('Error fetching customer:', customerError);
        return null;
      }

      // Fetch booking views if needed
      const { data: bookingViewsData } = await supabase
        .from('booking_views')
        .select('id, booking_id, access_code, created_at, last_accessed_at')
        .eq('booking_id', bookingId);

      return {
        ...bookingData,
        station: stationData,
        customer: customerData,
        booking_views: bookingViewsData || [],
      } as Booking;
    } catch (error) {
      console.error('Error in fetchBookingDetails:', error);
      return null;
    }
  };

  // Add notification
  const addNotification = useCallback((booking: Booking) => {
    const isPaid = !!(booking.payment_mode && booking.payment_mode !== 'venue' && booking.payment_txn_id);

    const notification: BookingNotification = {
      id: `${booking.id}-${Date.now()}`,
      booking,
      timestamp: new Date(),
      isPaid,
      isRead: false,
    };

    // Play sound (if enabled)
    if (soundEnabled) {
      playNotificationSound(isPaid);
    }

    // Show toast notification
    const bookingDate = format(new Date(booking.booking_date), 'MMM dd, yyyy');
    toast.success(`New ${isPaid ? 'Paid ' : ''}Booking: ${booking.customer.name}`, {
      description: `${booking.station.name} • ${bookingDate} • ${booking.start_time}`,
      duration: 5000,
    });

    // Add to notifications array
    setNotifications(prev => [notification, ...prev]);
  }, [soundEnabled]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('global-booking-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        async (payload) => {
          // Only process INSERT events
          if (payload.eventType !== 'INSERT') return;

          const bookingId = payload.new?.id;
          if (!bookingId) return;

          // Check if already processed (deduplication)
          if (previousBookingIdsRef.current.has(bookingId)) {
            return;
          }

          // Delay to ensure booking is fully committed
          setTimeout(async () => {
            const booking = await fetchBookingDetails(bookingId);
            if (booking) {
              addNotification(booking);
              // Mark as processed
              setPreviousBookingIds(prev => {
                const updated = new Set([...prev, bookingId]);
                previousBookingIdsRef.current = updated;
                localStorage.setItem(STORAGE_KEY_PREVIOUS_IDS, JSON.stringify([...updated]));
                return updated;
              });
            }
          }, 500);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to booking notifications');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to booking notifications');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [addNotification]);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Mark as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    try {
      localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
    } catch (error) {
      console.error('Error clearing notifications from localStorage:', error);
    }
  }, []);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const value: BookingNotificationContextType = {
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
  };

  return (
    <BookingNotificationContext.Provider value={value}>
      {children}
    </BookingNotificationContext.Provider>
  );
};

export const useBookingNotifications = () => {
  const context = useContext(BookingNotificationContext);
  if (context === undefined) {
    throw new Error('useBookingNotifications must be used within a BookingNotificationProvider');
  }
  return context;
};

