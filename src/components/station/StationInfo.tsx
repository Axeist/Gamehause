
import React from 'react';
import { Station } from '@/context/POSContext';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Gamepad2, CircleOff, Table2, UserCheck, User } from 'lucide-react';
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
  // Different styling based on station type
  const isPoolTable = station.type === '8ball';
  const isFoosballTable = station.type === 'foosball';
  const isPublicBooking = station.isPublicBooking !== false;
  
  // Check if customer is a member and membership is active
  const isMember = customerData ? isMembershipActive(customerData) : false;
  const membershipText = customerData && customerData.isMember ? getMembershipBadgeText(customerData) : 'Non-Member';
  
  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex items-center text-lg font-heading">
          {isPoolTable ? (
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-green-900 rounded-md"></div>
              <CircleOff className="h-6 w-6 text-green-300 z-10" />
              <div className="absolute inset-0 border-2 border-green-700 rounded-md"></div>
            </div>
          ) : isFoosballTable ? (
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-800 to-amber-950 rounded-md"></div>
              <Table2 className="h-6 w-6 text-amber-200 z-10" />
              <div className="absolute inset-0 border-2 border-amber-700 rounded-md"></div>
            </div>
          ) : (
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black rounded-md"></div>
              <Gamepad2 className="h-6 w-6 text-cuephoria-lightpurple z-10" />
              <div className="absolute bottom-0 h-1 w-8 mx-auto bg-cuephoria-purple rounded-t-lg"></div>
            </div>
          )}
          <span className={`ml-2 font-bold ${isPoolTable ? 'text-green-500' : isFoosballTable ? 'text-amber-300' : 'text-cuephoria-lightpurple'}`}>
            {station.name}
          </span>
        </div>
        <Badge 
          className={`
            ${station.isOccupied 
              ? 'bg-cuephoria-orange text-white' 
              : isPoolTable 
                ? 'bg-green-500 text-white' 
                : isFoosballTable
                  ? 'bg-amber-500 text-white'
                  : 'bg-cuephoria-lightpurple text-white'
            } 
            ${station.isOccupied ? 'animate-pulse' : ''}
          `}
        >
          {station.isOccupied ? 'Occupied' : 'Available'}
        </Badge>
      </div>
      
      <div className="flex flex-col space-y-2 mt-2">
        <div className="flex justify-between text-sm">
          <span>Hourly Rate:</span>
          <CurrencyDisplay amount={station.hourlyRate} />
        </div>

        {/* Live on public booking toggle */}
        {onPublicBookingToggle && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`h-2 w-2 rounded-full ${isPublicBooking ? "bg-green-500" : "bg-red-500"}`}
              />
              <span className="text-xs text-gray-400 truncate">
                {isPublicBooking ? "Live on public booking" : "Disabled on public booking"}
              </span>
            </div>
            <Switch
              checked={isPublicBooking}
              disabled={publicBookingUpdating}
              onCheckedChange={(checked) => onPublicBookingToggle(checked)}
              className={publicBookingUpdating ? "opacity-70" : ""}
            />
          </div>
        )}
        
        {station.isOccupied && station.currentSession && (
          <>
            <div className="flex justify-between text-sm">
              <span>Customer:</span>
              <span className="font-semibold">{customerName}</span>
            </div>
            
            {/* Membership indicator */}
            <div className="flex justify-between items-center text-sm">
              <span>Status:</span>
              <Badge 
                className={`
                  ${isMember
                    ? 'bg-green-600 text-white border-green-700'
                    : 'bg-gray-600 text-white border-gray-700'
                  }
                  flex items-center gap-1
                `}
              >
                {isMember ? <UserCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {membershipText}
              </Badge>
            </div>
            {isMember && (
              <div className="text-xs text-right mt-0 text-green-500">
                50% discount applied
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default StationInfo;
