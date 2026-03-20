import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { usePOS, Station } from '@/context/POSContext';
import StationInfo from '@/components/station/StationInfo';
import StationTimer from '@/components/station/StationTimer';
import StationActions from '@/components/station/StationActions';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, Tag, Users, AlertTriangle, ShieldAlert, Loader2, Wrench } from 'lucide-react';
import EditStationDialog from './EditStationDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface StationCardProps {
  station: Station;
}

const StationCard: React.FC<StationCardProps> = ({ station }) => {
  const { stations, customers, startSession, endSession, deleteStation, checkDeleteBlockers, forceDeleteStation, updateStation, updateStationImage, updateStationPublicBooking } = usePOS();
  const isPoolTable = station.type === '8ball';
  const isFoosballTable = station.type === 'foosball';
  const isPs5 = station.type === 'ps5';
  const isMisc = station.type === 'misc';

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [publicBookingUpdating, setPublicBookingUpdating] = useState(false);
  const [safeDeleteOpen, setSafeDeleteOpen] = useState(false);
  const [deleteChecking, setDeleteChecking] = useState(false);
  const [deleteBlockers, setDeleteBlockers] = useState<{ sessions: number; billItems: number; bookings: number } | null>(null);
  const [isForceDeleting, setIsForceDeleting] = useState(false);

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (station.isOccupied) return;
    setDeleteChecking(true);
    setDeleteBlockers(null);
    setSafeDeleteOpen(true);
    const blockers = await checkDeleteBlockers(station.id);
    setDeleteBlockers(blockers);
    setDeleteChecking(false);
  };

  const handleConfirmSimpleDelete = async () => {
    setSafeDeleteOpen(false);
    await deleteStation(station.id);
  };

  const handleForceDelete = async () => {
    setIsForceDeleting(true);
    await forceDeleteStation(station.id);
    setIsForceDeleting(false);
    setSafeDeleteOpen(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDialogOpen(true);
  };

  const getFallbackImageSrc = () => {
    if (station.type === 'foosball') return '/Foosball.jpeg';
    if (station.type !== '8ball') return null;
    const name = station.name.toLowerCase();
    if (name.includes('american')) return '/American table.jpg';
    if (name.includes('medium')) return '/Medium Table.jpg';
    if (name.includes('standard')) return '/Standard Table.jpg';
    return null;
  };

  const cardImageSrc = station.imageUrl ?? getFallbackImageSrc();

  const customer = station.currentSession
    ? customers.find(c => c.id === station.currentSession!.customerId)
    : null;
  const customerName = customer ? customer.name : 'Unknown Customer';

  const handlePublicBookingToggle = async (enabled: boolean) => {
    setPublicBookingUpdating(true);
    try {
      await updateStationPublicBooking(station.id, enabled);
    } finally {
      setPublicBookingUpdating(false);
    }
  };

  // Session rate info
  const session = station.currentSession;
  const hasCoupon = session?.couponCode;
  const sessionRate = session?.hourlyRate ?? station.hourlyRate;
  const originalRate = session?.originalRate;   // pre-coupon total (already player-multiplied)
  const sessionPlayerCount = session?.playerCount;
  const isDiscounted = hasCoupon && originalRate !== undefined && originalRate > sessionRate;

  // Derive player count from rates for backwards-compat (older sessions without playerCount stored)
  const effectivePlayerCount: number | undefined = (() => {
    if (!isPs5 || !station.isOccupied || !session) return undefined;
    if (sessionPlayerCount !== undefined) return sessionPlayerCount;
    const totalRate = originalRate ?? sessionRate;
    if (!totalRate || station.hourlyRate <= 0) return undefined;
    const derived = Math.round(totalRate / station.hourlyRate);
    return derived >= 1 ? derived : undefined;
  })();

  // Border / background based on type + state
  const cardClass = (() => {
    if (station.isOccupied) {
      if (customer?.isMember) return 'border-green-500 bg-black/80';
      if (hasCoupon) return 'border-orange-500 bg-black/80';
      return 'border-cuephoria-orange bg-black/80';
    }
    if (isPoolTable) return 'border-green-500 bg-gradient-to-b from-green-900/30 to-green-950/40';
    if (isFoosballTable) return 'border-amber-500 bg-gradient-to-b from-amber-900/30 to-amber-950/40';
    if (isPs5) return 'border-[#9b87f5] bg-gradient-to-b from-[#6E59A5]/25 to-black/55';
    if (isMisc) return 'border-slate-600 bg-gradient-to-b from-slate-800/30 to-slate-950/40';
    return 'border-gamehaus-purple bg-gradient-to-b from-gamehaus-purple/15 to-black/55';
  })();

  const accentBorderClass = isPoolTable ? 'border-green-500' : isFoosballTable ? 'border-amber-500' : isMisc ? 'border-slate-500' : 'border-[#9b87f5]';

  const iconButtonClass = isPoolTable
    ? 'text-green-300 hover:text-blue-500 hover:bg-green-950/50'
    : isFoosballTable
    ? 'text-amber-300 hover:text-amber-200 hover:bg-amber-950/40'
    : isMisc
    ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/40'
    : 'text-[#9b87f5] hover:text-[#c4b5fd] hover:bg-[#6E59A5]/20';

  return (
    <>
      <Card className={`relative overflow-hidden card-hover animate-scale-in h-full ${cardClass} ${isPoolTable || isFoosballTable ? 'rounded-xl' : 'rounded-lg'}`}>
        {/* Foosball corner dots */}
        {isFoosballTable && (
          <>
            <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-300" />
            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-300" />
            <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-300" />
            <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-300" />
            <div className="absolute w-full h-[1px] top-10 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          </>
        )}

        {/* Pool corner dots */}
        {isPoolTable && (
          <>
            <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-300" />
            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-300" />
            <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-300" />
            <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-300" />
            <div className="absolute w-full h-[1px] top-10 bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
          </>
        )}

        {/* PS5 ambient elements */}
        {isPs5 && (
          <>
            <div className="absolute right-0 top-0 w-8 h-3 bg-[#9b87f5]/18 rounded-bl-lg" />
            <div className="absolute w-full h-[1px] top-10 bg-gradient-to-r from-transparent via-[#9b87f5]/30 to-transparent" />
            <div className="absolute left-4 bottom-3 w-1 h-1 rounded-full bg-cuephoria-orange animate-pulse-soft" />
            <div className="absolute left-7 bottom-3 w-1 h-1 rounded-full bg-[#9b87f5] animate-pulse-soft delay-100" />
            {/* Players badge — always visible, changes text based on state */}
            {station.isOccupied && effectivePlayerCount !== undefined ? (
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-[#9b87f5]/30 border border-[#9b87f5]/50 text-[#9b87f5] text-[10px] font-bold px-2 py-0.5 rounded-full">
                <Users className="h-2.5 w-2.5" />
                {effectivePlayerCount} players
              </div>
            ) : !station.isOccupied && station.maxPlayers ? (
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-[#9b87f5]/20 border border-[#9b87f5]/30 text-[#9b87f5] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                <Users className="h-2.5 w-2.5" />
                Up to {station.maxPlayers} players
              </div>
            ) : null}
          </>
        )}

        {/* Coupon badge */}
        {station.isOccupied && hasCoupon && (
          <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
            <Tag className="h-3 w-3" />
            {session!.couponCode}
          </div>
        )}

        {/* Membership top stripe */}
        {station.isOccupied && customer && (
          <div className="absolute top-0 left-0 w-full h-1.5 z-20">
            <div className={`h-full ${customer.isMember ? 'bg-green-500' : 'bg-gray-500'} w-2/3 rounded-br-lg`} />
          </div>
        )}

        <CardHeader className="pb-2 relative z-10">
          {cardImageSrc && (
            <div className="relative mb-3 overflow-hidden rounded-lg border border-white/10 bg-black/20" style={{ aspectRatio: '16 / 9' }}>
              <img
                src={cardImageSrc}
                alt={`${station.name} image`}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-95"
              />
            </div>
          )}
          <div className="flex justify-between items-start gap-2">
            <div className="flex-grow min-w-0">
              <StationInfo
                station={station}
                customerName={customerName}
                customerData={customer}
                onPublicBookingToggle={handlePublicBookingToggle}
                publicBookingUpdating={publicBookingUpdating}
              />
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 shrink-0 ${iconButtonClass}`}
                disabled={station.isOccupied}
                onClick={handleEditClick}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 shrink-0 ${isPoolTable ? 'text-green-300 hover:text-red-500 hover:bg-green-950/50' : isFoosballTable ? 'text-amber-300 hover:text-red-500 hover:bg-amber-950/40' : isMisc ? 'text-slate-300 hover:text-red-500 hover:bg-slate-700/40' : 'text-[#9b87f5] hover:text-destructive hover:bg-[#6E59A5]/20'}`}
                disabled={station.isOccupied}
                onClick={handleDeleteClick}
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              {/* Safe Delete Dialog */}
              <Dialog open={safeDeleteOpen} onOpenChange={setSafeDeleteOpen}>
                <DialogContent className={`max-w-md ${accentBorderClass}`}>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      {deleteChecking ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Checking station data…</>
                      ) : deleteBlockers && deleteBlockers.billItems > 0 ? (
                        <><ShieldAlert className="h-5 w-5 text-green-400" />Delete {station.name}</>
                      ) : deleteBlockers && (deleteBlockers.sessions > 0 || deleteBlockers.bookings > 0) ? (
                        <><AlertTriangle className="h-5 w-5 text-orange-400" />Delete {station.name}</>
                      ) : (
                        <><Trash2 className="h-5 w-5 text-destructive" />Delete {station.name}</>
                      )}
                    </DialogTitle>

                    {!deleteChecking && deleteBlockers && (
                      <DialogDescription asChild>
                        <div className="space-y-3 pt-1">
                          {deleteBlockers.billItems > 0 ? (
                            <div className="space-y-2">
                              <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-300 space-y-1">
                                <p className="font-semibold">✅ Billing transactions will be preserved</p>
                                <p className="text-xs text-muted-foreground">
                                  {deleteBlockers.billItems} transaction{deleteBlockers.billItems !== 1 ? 's' : ''} across{' '}
                                  {deleteBlockers.sessions} session{deleteBlockers.sessions !== 1 ? 's' : ''} will be kept —
                                  the station name "<strong>{station.name}</strong>" will be recorded on each.
                                </p>
                              </div>
                              {(deleteBlockers.sessions - deleteBlockers.billItems > 0 || deleteBlockers.bookings > 0) && (
                                <div className="rounded-lg border border-orange-500/30 bg-orange-500/8 p-3 text-sm text-orange-300 space-y-1">
                                  <p className="font-medium">The following will be permanently deleted:</p>
                                  <ul className="list-disc list-inside text-xs space-y-0.5">
                                    {deleteBlockers.sessions > deleteBlockers.billItems && (
                                      <li>{deleteBlockers.sessions - Math.floor(deleteBlockers.billItems)} orphaned session{deleteBlockers.sessions - Math.floor(deleteBlockers.billItems) !== 1 ? 's' : ''} (no billing)</li>
                                    )}
                                    {deleteBlockers.bookings > 0 && (
                                      <li>{deleteBlockers.bookings} booking{deleteBlockers.bookings !== 1 ? 's' : ''}</li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : deleteBlockers.sessions > 0 || deleteBlockers.bookings > 0 ? (
                            <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-300 space-y-1">
                              <p className="font-medium">The following will be permanently deleted:</p>
                              <ul className="list-disc list-inside text-xs space-y-0.5">
                                {deleteBlockers.sessions > 0 && (
                                  <li>{deleteBlockers.sessions} session{deleteBlockers.sessions !== 1 ? 's' : ''} (no billing attached)</li>
                                )}
                                {deleteBlockers.bookings > 0 && (
                                  <li>{deleteBlockers.bookings} booking{deleteBlockers.bookings !== 1 ? 's' : ''}</li>
                                )}
                              </ul>
                              <p className="text-xs text-muted-foreground mt-1">This cannot be undone.</p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Are you sure you want to delete <strong>{station.name}</strong>? This action cannot be undone.
                            </p>
                          )}
                        </div>
                      </DialogDescription>
                    )}
                  </DialogHeader>

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setSafeDeleteOpen(false)}>Cancel</Button>
                    {!deleteChecking && deleteBlockers && (
                      <Button
                        variant="destructive"
                        onClick={deleteBlockers.sessions > 0 || deleteBlockers.billItems > 0 || deleteBlockers.bookings > 0 ? handleForceDelete : handleConfirmSimpleDelete}
                        disabled={isForceDeleting}
                      >
                        {isForceDeleting
                          ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting…</>
                          : <><Trash2 className="h-4 w-4 mr-2" />Delete Everything</>
                        }
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-2 relative z-10">
          {station.isOccupied && station.currentSession && (
            <div className="flex flex-col space-y-2">
              <StationTimer station={station} />

              {/* Coupon discount summary below timer */}
              {isDiscounted && originalRate !== undefined && (
                <div className="flex items-center gap-2 text-xs text-orange-300 bg-orange-500/10 border border-orange-500/25 rounded-md px-3 py-1.5">
                  <Tag className="h-3 w-3 shrink-0" />
                  <span>
                    Saving <strong>₹{originalRate - sessionRate}/hr</strong> with coupon {session!.couponCode}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col space-y-2 pt-2 relative z-10">
          <StationActions
            station={station}
            customers={customers}
            onStartSession={startSession}
            onEndSession={endSession}
          />
        </CardFooter>
      </Card>

      <EditStationDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        station={station}
        onSave={updateStation}
        onUpdateImage={updateStationImage}
        allStations={stations}
      />
    </>
  );
};

export default StationCard;
