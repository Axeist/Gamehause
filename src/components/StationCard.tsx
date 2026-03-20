import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { usePOS, Station } from '@/context/POSContext';
import StationInfo from '@/components/station/StationInfo';
import StationTimer from '@/components/station/StationTimer';
import StationActions from '@/components/station/StationActions';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, Tag, TrendingDown, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import EditStationDialog from './EditStationDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface StationCardProps {
  station: Station;
}

const StationCard: React.FC<StationCardProps> = ({ station }) => {
  const { stations, customers, startSession, endSession, deleteStation, checkDeleteBlockers, forceDeleteStation, updateStation, updateStationImage, updateStationPublicBooking } = usePOS();
  const isPoolTable = station.type === '8ball';
  const isFoosballTable = station.type === 'foosball';
  const isPs5 = station.type === 'ps5';
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [publicBookingUpdating, setPublicBookingUpdating] = useState(false);
  const [safeDeleteOpen, setSafeDeleteOpen] = useState(false);
  const [deleteChecking, setDeleteChecking] = useState(false);
  const [deleteBlockers, setDeleteBlockers] = useState<{ sessions: number; billItems: number } | null>(null);
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

  const getCustomer = (id: string) => {
    return customers.find(c => c.id === id);
  };

  const customer = station.currentSession 
    ? getCustomer(station.currentSession.customerId)
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
  
  // ✅ NEW: Get coupon information from session
  const session = station.currentSession;
  const hasCoupon = session?.couponCode;
  const discountedRate = session?.hourlyRate || station.hourlyRate;
  const originalRate = session?.originalRate || station.hourlyRate;
  const isDiscounted = hasCoupon && discountedRate !== originalRate;
    
  const handleDeleteStation = () => {};


  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDialogOpen(true);
  };

  return (
    <>
      <Card 
        className={`
          relative overflow-hidden card-hover animate-scale-in h-full
          ${station.isOccupied 
            ? customer?.isMember 
              ? 'border-green-500 bg-black/80' 
              : hasCoupon
                ? 'border-orange-500 bg-black/80'
                : 'border-cuephoria-orange bg-black/80' 
            : isPoolTable 
              ? 'border-green-500 bg-gradient-to-b from-green-900/30 to-green-950/40' 
              : isFoosballTable
                ? 'border-amber-500 bg-gradient-to-b from-amber-900/30 to-amber-950/40'
                : isPs5
                  ? 'border-[#9b87f5] bg-gradient-to-b from-[#6E59A5]/25 to-black/55'
                  : 'border-gamehaus-purple bg-gradient-to-b from-gamehaus-purple/15 to-black/55'
          }
          ${isPoolTable || isFoosballTable ? 'rounded-xl' : 'rounded-lg'}
        `}
      >
        {/* Foosball Table Visual Elements */}
        {isFoosballTable && (
          <>
            <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-300"></div>
            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-300"></div>
            <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-300"></div>
            <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-300"></div>
            <div className="absolute w-full h-[1px] top-10 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>
          </>
        )}

        {/* Pool Table Visual Elements */}
        {isPoolTable && (
          <>
            <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-300"></div>
            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-300"></div>
            <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-300"></div>
            <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-300"></div>
            <div className="absolute w-full h-[1px] top-10 bg-gradient-to-r from-transparent via-green-500/30 to-transparent"></div>
          </>
        )}
        
        {/* PS5 Visual Elements */}
        {isPs5 && (
          <>
            <div className="absolute right-0 top-0 w-8 h-3 bg-[#9b87f5]/18 rounded-bl-lg"></div>
            <div className="absolute w-full h-[1px] top-10 bg-gradient-to-r from-transparent via-[#9b87f5]/30 to-transparent"></div>
            <div className="absolute left-4 bottom-3 w-1 h-1 rounded-full bg-cuephoria-orange animate-pulse-soft"></div>
            <div className="absolute left-7 bottom-3 w-1 h-1 rounded-full bg-[#9b87f5] animate-pulse-soft delay-100"></div>
            {station.maxPlayers && !station.isOccupied && (
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-[#9b87f5]/20 border border-[#9b87f5]/30 text-[#9b87f5] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                <TrendingDown className="h-2.5 w-2.5" />
                Up to {station.maxPlayers} players
              </div>
            )}
          </>
        )}

        {/* ✅ NEW: Coupon Badge (shows when session has coupon) */}
        {station.isOccupied && hasCoupon && (
          <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
            <Tag className="h-3 w-3" />
            {session.couponCode}
          </div>
        )}

        {/* Membership indicator on top of card */}
        {station.isOccupied && customer && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-transparent to-transparent z-20">
            <div className={`h-full ${customer.isMember ? 'bg-green-500' : 'bg-gray-500'} w-2/3 rounded-br-lg`}></div>
          </div>
        )}

        <CardHeader className="pb-2 relative z-10">
          {cardImageSrc && (
            <div
              className="relative mb-3 overflow-hidden rounded-lg border border-white/10 bg-black/20"
              style={{ aspectRatio: "16 / 9" }}
            >
              <img
                src={cardImageSrc}
                alt={`${station.name} image`}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-95"
              />
            </div>
          )}
          <div className="flex justify-between items-center space-x-2">
            <div className="flex-grow">
              <StationInfo
                station={station}
                customerName={customerName}
                customerData={customer}
                onPublicBookingToggle={handlePublicBookingToggle}
                publicBookingUpdating={publicBookingUpdating}
              />
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`
                  h-8 w-8 shrink-0 
                  ${isPoolTable 
                    ? 'text-green-300 hover:text-blue-500 hover:bg-green-950/50' 
                    : isFoosballTable
                      ? 'text-amber-300 hover:text-amber-200 hover:bg-amber-950/40'
                      : 'text-[#9b87f5] hover:text-[#c4b5fd] hover:bg-[#6E59A5]/20'
                  }
                `}
                disabled={station.isOccupied}
                onClick={handleEditClick}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`
                    h-8 w-8 shrink-0 
                    ${isPoolTable 
                      ? 'text-green-300 hover:text-red-500 hover:bg-green-950/50' 
                      : isFoosballTable
                        ? 'text-amber-300 hover:text-red-500 hover:bg-amber-950/40'
                        : 'text-[#9b87f5] hover:text-destructive hover:bg-[#6E59A5]/20'
                    }
                  `}
                  disabled={station.isOccupied}
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

              {/* Safe Delete Dialog */}
              <Dialog open={safeDeleteOpen} onOpenChange={setSafeDeleteOpen}>
                <DialogContent className={`max-w-md ${isPoolTable ? 'border-green-500' : isFoosballTable ? 'border-amber-500' : 'border-[#9b87f5]'}`}>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      {deleteChecking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Checking station data…
                        </>
                      ) : deleteBlockers?.billItems ? (
                        <>
                          <ShieldAlert className="h-5 w-5 text-destructive" />
                          Cannot Delete Station
                        </>
                      ) : deleteBlockers?.sessions ? (
                        <>
                          <AlertTriangle className="h-5 w-5 text-orange-400" />
                          Orphaned Sessions Found
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-5 w-5 text-destructive" />
                          Delete {station.name}
                        </>
                      )}
                    </DialogTitle>

                    {!deleteChecking && deleteBlockers && (
                      <DialogDescription asChild>
                        <div className="space-y-3 pt-1">
                          {deleteBlockers.billItems > 0 ? (
                            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                              <p className="font-semibold mb-1">This station cannot be deleted.</p>
                              <p>
                                It has <strong>{deleteBlockers.sessions} session{deleteBlockers.sessions !== 1 ? 's' : ''}</strong> linked
                                to <strong>{deleteBlockers.billItems} billing transaction{deleteBlockers.billItems !== 1 ? 's' : ''}</strong>.
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                Deleting would corrupt your financial history. Archive or reassign this station instead.
                              </p>
                            </div>
                          ) : deleteBlockers.sessions > 0 ? (
                            <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-300">
                              <p>
                                This station has <strong>{deleteBlockers.sessions} orphaned session{deleteBlockers.sessions !== 1 ? 's' : ''}</strong> with
                                no billing transactions attached.
                              </p>
                              <p className="mt-2">
                                These sessions will be <strong>permanently deleted</strong> along with the station.
                                This cannot be undone.
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Are you sure you want to delete <strong>{station.name}</strong>?
                              This action cannot be undone.
                            </p>
                          )}
                        </div>
                      </DialogDescription>
                    )}
                  </DialogHeader>

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setSafeDeleteOpen(false)}>
                      Cancel
                    </Button>

                    {!deleteChecking && deleteBlockers && (
                      <>
                        {deleteBlockers.billItems > 0 ? null : deleteBlockers.sessions > 0 ? (
                          <Button
                            variant="destructive"
                            onClick={handleForceDelete}
                            disabled={isForceDeleting}
                          >
                            {isForceDeleting ? (
                              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting…</>
                            ) : (
                              <><Trash2 className="h-4 w-4 mr-2" />Delete Station & Sessions</>
                            )}
                          </Button>
                        ) : (
                          <Button variant="destructive" onClick={handleConfirmSimpleDelete}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Station
                          </Button>
                        )}
                      </>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2 relative z-10">
          <div className="flex flex-col space-y-2">
            {station.isOccupied && station.currentSession && (
              <>
                <StationTimer station={station} />
                
                {/* ✅ NEW: Show discounted rate information */}
                {isDiscounted && (
                  <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-md animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-orange-400">
                        <TrendingDown className="h-3 w-3" />
                        <span className="font-medium">Discounted Rate</span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-sm line-through text-gray-400 indian-rupee">
                        {originalRate}/hr
                      </span>
                      <span className="text-lg font-bold text-orange-400 indian-rupee">
                        {discountedRate}/hr
                      </span>
                      {discountedRate === 0 && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                          FREE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-orange-300 mt-1">
                      Saving ₹{originalRate - discountedRate}/hr
                    </div>
                  </div>
                )}
                
                {/* ✅ Show regular rate if no coupon */}
                {!isDiscounted && (
                  <div className={`mt-2 p-2 rounded-md ${isPs5 ? 'bg-[#6E59A5]/12 border border-[#9b87f5]/25' : 'bg-gamehaus-purple/10 border border-gamehaus-purple/25'}`}>
                    <div className="text-xs text-gray-400">Current Rate</div>
                    <div className={`text-lg font-bold indian-rupee ${isPs5 ? 'text-[#9b87f5]' : 'text-gamehaus-lightpurple'}`}>
                      {station.hourlyRate}/hr
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
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

      {/* Edit Station Dialog */}
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
