import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { StationSelector } from '@/components/booking/StationSelector';
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker';
import { CalendarIcon, CheckCircle2, Circle, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';

interface Station {
  id: string;
  name: string;
  type: 'ps5' | '8ball' | 'foosball' | 'misc';
  hourly_rate: number;
  max_players?: number | null;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export default function BookingPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [selectedGames, setSelectedGames] = useState<Station[]>([]);
  const [activeGame, setActiveGame] = useState<Station | null>(null);
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlotsByGame, setAvailableSlotsByGame] = useState<Record<string, TimeSlot[]>>({});
  const [slotsLoadingByGame, setSlotsLoadingByGame] = useState<Record<string, boolean>>({});
  const [gameSlots, setGameSlots] = useState<Record<string, TimeSlot | undefined>>({});
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [validationError, setValidationError] = useState<string>('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  // Fetch stations on component mount
  useEffect(() => {
    fetchStations();
  }, []);

  // Keep selected game metadata in sync with selected station IDs
  useEffect(() => {
    const games = stations.filter((s) => selectedStations.includes(s.id));
    setSelectedGames(games);
    if (!games.length) {
      setActiveGame(null);
      return;
    }
    if (!activeGame || !games.some((g) => g.id === activeGame.id)) {
      setActiveGame(games[0]);
    }
  }, [stations, selectedStations, activeGame]);

  useEffect(() => {
    if (!activeGame || !selectedDate) return;
    fetchAvailableSlots(activeGame.id);
  }, [activeGame?.id, selectedDate]);

  const fetchStations = async () => {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('id, name, type, hourly_rate, max_players')
        .or('is_controller.is.null,is_controller.eq.false')
        .order('name');

      if (error) throw error;
      setStations((data || []).map(s => ({ ...s, max_players: s.max_players ?? null })) as Station[]);
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('Failed to load stations');
    }
  };

  const fetchAvailableSlots = async (stationId: string) => {
    if (!stationId) return;
    setSlotsLoadingByGame((prev) => ({ ...prev, [stationId]: true }));
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .rpc('get_available_slots', {
          p_date: dateStr,
          p_station_id: stationId,
          p_slot_duration: 60
        });

      if (error) throw error;
      setAvailableSlotsByGame((prev) => ({ ...prev, [stationId]: data || [] }));
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast.error('Failed to load available time slots');
    } finally {
      setSlotsLoadingByGame((prev) => ({ ...prev, [stationId]: false }));
    }
  };

  const handleStationToggle = (stationId: string) => {
    setSelectedStations(prev => {
      const isRemoving = prev.includes(stationId);
      if (isRemoving) {
        setPlayerCounts((counts) => {
          const next = { ...counts };
          delete next[stationId];
          return next;
        });
        setGameSlots((prev) => {
          const next = { ...prev };
          delete next[stationId];
          return next;
        });
        setAvailableSlotsByGame((prev) => {
          const next = { ...prev };
          delete next[stationId];
          return next;
        });
        return prev.filter(id => id !== stationId);
      }
      const st = stations.find(s => s.id === stationId);
      if (st?.type === 'ps5') {
        setPlayerCounts((counts) => ({ ...counts, [stationId]: counts[stationId] ?? 1 }));
      }
      return [...prev, stationId];
    });
    setValidationError('');
  };

  const handlePlayerCountChange = (stationId: string, delta: number) => {
    const station = stations.find(s => s.id === stationId);
    if (!station) return;
    const maxP = station.max_players ?? 4;
    setPlayerCounts((prev) => ({
      ...prev,
      [stationId]: Math.max(1, Math.min(maxP, (prev[stationId] ?? 1) + delta)),
    }));
  };

  const handleSlotSelect = (slot: TimeSlot | null) => {
    if (!activeGame) return;
    setGameSlots((prev) => {
      const next = { ...prev };
      if (!slot) {
        delete next[activeGame.id];
      } else {
        next[activeGame.id] = slot;
      }
      return next;
    });
    setValidationError('');
  };

  const applySameTimeToAll = () => {
    if (!selectedGames.length) return;
    const firstGameSlot = gameSlots[selectedGames[0].id];
    if (!firstGameSlot) {
      toast.error('Select a time for at least one game first');
      return;
    }

    const updated: Record<string, TimeSlot> = {};
    selectedGames.forEach((game) => {
      updated[game.id] = firstGameSlot;
    });
    setGameSlots(updated);
    setValidationError('');
    toast.success('Applied the same time to all selected games');
  };

  const isAllGamesAssigned = useMemo(
    () => selectedGames.length > 0 && selectedGames.every((game) => !!gameSlots[game.id]),
    [selectedGames, gameSlots]
  );

  const calculateTotalPrice = () =>
    selectedGames.reduce((sum, station) => {
      const count = station.type === 'ps5' ? (playerCounts[station.id] ?? 1) : 1;
      const slot = gameSlots[station.id];
      const durationInHours = slot
        ? (new Date(`2000-01-01T${slot.end_time}`).getTime() - new Date(`2000-01-01T${slot.start_time}`).getTime()) / (1000 * 60 * 60)
        : 0;
      return sum + station.hourly_rate * count * Math.max(durationInHours, 0);
    }, 0);

  const canGoStep2 = selectedGames.length > 0;

  const goToStep2 = () => {
    if (!canGoStep2) {
      toast.error('Please select at least one game');
      return;
    }
    setCurrentStep(2);
  };

  const goToStep3 = () => {
    if (!isAllGamesAssigned) {
      setValidationError('Please select time for all selected games');
      toast.error('Please select time for all selected games');
      return;
    }
    setCurrentStep(3);
  };

  const handleBookingSubmit = async () => {
    // Validation
    if (selectedStations.length === 0) {
      toast.error('Please select at least one station');
      return;
    }
    if (!isAllGamesAssigned) {
      toast.error('Please select time for all selected games');
      return;
    }
    if (!customerInfo.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!customerInfo.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      // First, create or find customer
      let customerId;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customerInfo.phone)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: customerInfo.name,
            phone: customerInfo.phone,
            email: customerInfo.email || null,
            is_member: false,
            loyalty_points: 0,
            total_spent: 0,
            total_play_time: 0
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      const groupId = crypto.randomUUID();
      const bookings = selectedGames.map((game) => {
        const slot = gameSlots[game.id]!;
        return {
          station_id: game.id,
          start_time: slot.start_time,
          end_time: slot.end_time,
          player_count: game.type === 'ps5' ? (playerCounts[game.id] ?? 1) : 1
        };
      });
      const { error: bookingError } = await supabase.rpc('create_group_booking' as any, {
        p_group_id: groupId,
        p_customer_id: customerId,
        p_booking_date: format(selectedDate, 'yyyy-MM-dd'),
        p_notes: customerInfo.notes || null,
        p_bookings: bookings
      } as any);

      if (bookingError) throw bookingError;

      toast.success('Booking confirmed successfully!');
      
      // Reset form
      setSelectedStations([]);
      setSelectedGames([]);
      setActiveGame(null);
      setPlayerCounts({});
      setGameSlots({});
      setCustomerInfo({ name: '', phone: '', email: '', notes: '' });
      setAvailableSlotsByGame({});
      setCurrentStep(1);
      setValidationError('');
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const totalPrice = calculateTotalPrice();
  const activeGameSlots = activeGame ? (availableSlotsByGame[activeGame.id] || []) : [];
  const activeGameSelection = activeGame ? gameSlots[activeGame.id] || null : null;
  const activeGameLoading = activeGame ? !!slotsLoadingByGame[activeGame.id] : false;

  const formatTimeLabel = (time: string) =>
    new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Book Your Gaming Session</h1>
        <p className="text-muted-foreground">
          Reserve PlayStation 5 or Pool Table sessions at Cuephoria
        </p>
        <div className="flex items-center justify-center gap-4 text-sm pt-2">
          {[
            { id: 1, label: 'Select Games' },
            { id: 2, label: 'Assign Time' },
            { id: 3, label: 'Review & Confirm' }
          ].map((step) => (
            <div key={step.id} className="flex items-center gap-2">
              {currentStep >= (step.id as 1 | 2 | 3) ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={currentStep === step.id ? 'font-medium text-primary' : 'text-muted-foreground'}>
                Step {step.id}: {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Booking Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Station Selection */}
          {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Select Stations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StationSelector
                stations={stations}
                selectedStations={selectedStations}
                onStationToggle={handleStationToggle}
                playerCounts={playerCounts}
                onPlayerCountChange={handlePlayerCountChange}
              />
              <div className="mt-4 flex justify-end">
                <Button onClick={goToStep2} disabled={!canGoStep2}>
                  Next: Assign Time
                </Button>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Step 2: Time assignment per selected game */}
          {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Assign Time to Each Game
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Select each game and assign its time slot. You must assign time for all selected games.
              </p>
              <div>
                <Label className="text-base font-medium">Choose Date</Label>
                <div className="mt-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date < today}
                    className="rounded-md border"
                  />
                </div>
              </div>

              {selectedGames.length > 0 && (
                <div>
                  {selectedGames.length > 1 && (
                    <div className="mb-4">
                      <Label className="text-base font-medium">Select Game to Assign Time</Label>
                      <Select
                        value={activeGame?.id}
                        onValueChange={(value) => {
                          const game = selectedGames.find((g) => g.id === value) || null;
                          setActiveGame(game);
                        }}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Choose game" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedGames.map((game) => (
                            <SelectItem key={game.id} value={game.id}>
                              {game.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex gap-2 mb-3">
                    <Button type="button" variant="secondary" onClick={applySameTimeToAll}>
                      Apply Same Time to All
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                      Back
                    </Button>
                  </div>

                  <Label className="text-base font-medium">Available Time Slots</Label>
                  <div className="mt-2">
                    <TimeSlotPicker
                      slots={activeGameSlots}
                      selectedSlot={activeGameSelection}
                      onSlotSelect={handleSlotSelect}
                      loading={activeGameLoading}
                    />
                  </div>
                </div>
              )}

              {selectedGames.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Assignment Status</Label>
                  {selectedGames.map((game) => (
                    <div key={game.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                      <span>{game.name}</span>
                      {gameSlots[game.id] ? (
                        <Badge variant="default">
                          {formatTimeLabel(gameSlots[game.id]!.start_time)} - {formatTimeLabel(gameSlots[game.id]!.end_time)}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Time Not Assigned</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}

              <div className="flex justify-end">
                <Button onClick={goToStep3} disabled={!isAllGamesAssigned}>
                  Next: Review & Confirm
                </Button>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Step 3: Review and customer information */}
          {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Review & Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                />
              </div>
              <div>
                <Label htmlFor="notes">Special Requests (Optional)</Label>
                <Textarea
                  id="notes"
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special requests or notes..."
                  rows={3}
                />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button 
                  onClick={handleBookingSubmit}
                  disabled={!isAllGamesAssigned || selectedStations.length === 0 || loading}
                >
                  {loading ? 'Creating Group Booking...' : 'Confirm Group Booking'}
                </Button>
              </div>
            </CardContent>
          </Card>
          )}
        </div>

        {/* Booking Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedGames.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Selected Games</Label>
                  <div className="mt-1 space-y-1">
                    {selectedGames.map((game) => {
                      return (
                        <Badge key={game.id} variant="secondary" className="mr-1">
                          {game.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedDate && (
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              )}

              {selectedGames.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Game Time Assignments</Label>
                  <div className="space-y-1 mt-1">
                    {selectedGames.map((game) => (
                      <p key={game.id} className="text-sm text-muted-foreground">
                        {game.name}: {gameSlots[game.id]
                          ? `${formatTimeLabel(gameSlots[game.id]!.start_time)} - ${formatTimeLabel(gameSlots[game.id]!.end_time)}`
                          : 'Not assigned'}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {totalPrice > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-medium">Total Amount</Label>
                    <span className="text-xl font-bold text-primary">₹{totalPrice}</span>
                  </div>
                </>
              )}

              {currentStep !== 3 && (
                <Button 
                  onClick={() => setCurrentStep(3)}
                  disabled={!isAllGamesAssigned || selectedStations.length === 0 || loading}
                  className="w-full"
                  size="lg"
                >
                  Proceed to Checkout
                </Button>
              )}

              {!isAllGamesAssigned && selectedGames.length > 0 && (
                <p className="text-xs text-destructive text-center">
                  Please select time for all selected games
                </p>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Payment will be collected at the venue
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}