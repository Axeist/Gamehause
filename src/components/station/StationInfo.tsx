
import React from 'react';
import { Station } from '@/context/POSContext';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Gamepad2, CircleOff, Table2, UserCheck, User, Wrench, Users } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Customer } from '@/types/pos.types';
import { isMembershipActive, getMembershipBadgeText } from '@/utils/membership.utils';

interface StationInfoProps {
  station: Station;
  customerName: string;
  customerData?: Customer | null;
  onPublicBookingToggle?: (enabled: boolean) => void;
  publicBookingUpdating?: boolean;
}

const StationInfo: React.FC<StationInfoProps> = ({
  station,
  customerName,
  customerData,
  onPublicBookingToggle,
  publicBookingUpdating = false,
}) => {
  const isPoolTable = station.type === '8ball';
  const isFoosballTable = station.type === 'foosball';
  const isPs5 = station.type === 'ps5';
  const isMisc = station.type === 'misc';
  const isPublicBooking = station.isPublicBooking !== false;

  const isMember = customerData ? isMembershipActive(customerData) : false;
  const membershipText = customerData && customerData.isMember ? getMembershipBadgeText(customerData) : 'Non-Member';

  const sessionPlayerCount = station.currentSession?.playerCount;
  const perPlayerRate = station.currentSession?.perPlayerRate ?? station.hourlyRate;

  // Derive player count from rates when not explicitly stored (backwards-compat for older sessions)
  const effectivePlayerCount: number | undefined = (() => {
    if (!isPs5 || !station.isOccupied || !station.currentSession) return undefined;
    if (sessionPlayerCount !== undefined) return sessionPlayerCount;
    if (station.hourlyRate <= 0) return undefined;
    const sess = station.currentSession;
    const sessionRate = sess.hourlyRate ?? station.hourlyRate;
    const origRate = sess.originalRate;
    // Use the higher value — robust to old sessions where originalRate = per-player base
    const totalRate = Math.max(sessionRate, origRate ?? sessionRate);
    const derived = Math.round(totalRate / station.hourlyRate);
    return derived >= 1 ? derived : undefined;
  })();

  const accentColor = isPoolTable
    ? 'text-green-500'
    : isFoosballTable
    ? 'text-amber-300'
    : isMisc
    ? 'text-slate-300'
    : 'text-cuephoria-lightpurple';

  const occupiedBadgeClass = 'bg-cuephoria-orange text-white animate-pulse';
  const availableBadgeClass = isPoolTable
    ? 'bg-green-500 text-white'
    : isFoosballTable
    ? 'bg-amber-500 text-white'
    : isMisc
    ? 'bg-slate-500 text-white'
    : 'bg-cuephoria-lightpurple text-white';

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex items-center text-lg font-heading">
          {isPoolTable ? (
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-green-900 rounded-md" />
              <CircleOff className="h-6 w-6 text-green-300 z-10" />
              <div className="absolute inset-0 border-2 border-green-700 rounded-md" />
            </div>
          ) : isFoosballTable ? (
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-800 to-amber-950 rounded-md" />
              <Table2 className="h-6 w-6 text-amber-200 z-10" />
              <div className="absolute inset-0 border-2 border-amber-700 rounded-md" />
            </div>
          ) : isMisc ? (
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 rounded-md" />
              <Wrench className="h-6 w-6 text-slate-300 z-10" />
              <div className="absolute inset-0 border-2 border-slate-600 rounded-md" />
            </div>
          ) : (
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black rounded-md" />
              <Gamepad2 className="h-6 w-6 text-cuephoria-lightpurple z-10" />
              <div className="absolute bottom-0 h-1 w-8 mx-auto bg-cuephoria-purple rounded-t-lg" />
            </div>
          )}
          <span className={`ml-2 font-bold ${accentColor}`}>{station.name}</span>
        </div>

        <Badge className={station.isOccupied ? occupiedBadgeClass : availableBadgeClass}>
          {station.isOccupied ? 'Occupied' : 'Available'}
        </Badge>
      </div>

      <div className="flex flex-col space-y-2 mt-2">
        {/* Rate row */}
        <div className="flex justify-between text-sm">
          <span>{isPs5 ? 'Rate / player:' : 'Hourly Rate:'}</span>
          <CurrencyDisplay amount={station.hourlyRate} />
        </div>

        {/* PS5 player info — always visible for multi-player */}
        {isPs5 && (
          station.isOccupied && effectivePlayerCount !== undefined && effectivePlayerCount > 1 ? (
            // Occupied multi-player: show active player breakdown
            <div className="flex justify-between items-center text-xs rounded-md px-2 py-1.5 bg-[#9b87f5]/15 border border-[#9b87f5]/30 text-[#9b87f5]">
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="h-3.5 w-3.5" />
                {effectivePlayerCount} players active
              </span>
              <span className="text-[#9b87f5]/80">
                {effectivePlayerCount} × ₹{perPlayerRate}/hr
              </span>
            </div>
          ) : !station.isOccupied && station.maxPlayers && station.maxPlayers > 1 ? (
            // Available: show capacity hint
            <div className="flex justify-between items-center text-xs text-[#9b87f5]/70">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Up to {station.maxPlayers} players
              </span>
              <span className="text-[#9b87f5]/50">₹{station.hourlyRate * station.maxPlayers}/hr max</span>
            </div>
          ) : null
        )}

        {/* Public booking toggle */}
        {onPublicBookingToggle && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`h-2 w-2 rounded-full ${isPublicBooking ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-400 truncate">
                {isPublicBooking ? 'Live on public booking' : 'Disabled on public booking'}
              </span>
            </div>
            <Switch
              checked={isPublicBooking}
              disabled={publicBookingUpdating}
              onCheckedChange={(checked) => onPublicBookingToggle(checked)}
              className={publicBookingUpdating ? 'opacity-70' : ''}
            />
          </div>
        )}

        {station.isOccupied && station.currentSession && (
          <>
            <div className="flex justify-between text-sm">
              <span>Customer:</span>
              <span className="font-semibold">{customerName}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span>Status:</span>
              <Badge
                className={`${
                  isMember
                    ? 'bg-green-600 text-white border-green-700'
                    : 'bg-gray-600 text-white border-gray-700'
                } flex items-center gap-1`}
              >
                {isMember ? <UserCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {membershipText}
              </Badge>
            </div>
            {isMember && (
              <div className="text-xs text-right mt-0 text-green-500">50% discount applied</div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default StationInfo;
