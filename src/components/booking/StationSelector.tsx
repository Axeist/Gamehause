import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, GamepadIcon, Table2 } from 'lucide-react';

interface Station {
  id: string;
  name: string;
  type: 'ps5' | '8ball' | 'foosball';
  hourly_rate: number;
  image_url?: string | null;
}

interface StationSelectorProps {
  stations: Station[];
  selectedStations: string[];
  onStationToggle: (stationId: string) => void;
  loading?: boolean;
}

export const StationSelector: React.FC<StationSelectorProps> = ({
  stations,
  selectedStations,
  onStationToggle,
  loading = false
}) => {
  const getStationIcon = (type: string) => {
    switch (type) {
      case 'ps5':
        return Monitor;
      case 'foosball':
        return Table2;
      default:
        return GamepadIcon;
    }
  };

  const getStationTypeLabel = (type: string) => {
    switch (type) {
      case 'ps5':
        return 'PlayStation 5';
      case 'foosball':
        return 'Foosball Table';
      default:
        return '8-Ball Pool';
    }
  };

  const getStationTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'ps5':
        return 'bg-cuephoria-purple/15 text-cuephoria-purple border-cuephoria-purple/20';
      case 'foosball':
        return 'bg-amber-400/15 text-amber-300 border-amber-400/20';
      default:
        return 'bg-emerald-400/15 text-emerald-300 border-emerald-400/20';
    }
  };

  const getPriceDisplay = (station: Station) => {
    return `₹${station.hourly_rate}/hour`;
  };

  const getFallbackImageSrc = (station: Station): string | null => {
    if (station.type === 'foosball') return '/Foosball.jpeg';
    if (station.type === 'ps5') return '/controller.png';
    if (station.type !== '8ball') return null;
    const name = station.name.toLowerCase();
    if (name.includes('american')) return '/American table.jpg';
    if (name.includes('medium')) return '/Medium Table.jpg';
    if (name.includes('standard')) return '/Standard Table.jpg';
    return null;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stations.map((station) => {
        const Icon = getStationIcon(station.type);
        const isSelected = selectedStations.includes(station.id);
        const imageSrc = station.image_url ?? getFallbackImageSrc(station);
        
        return (
          <Card
            key={station.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md border-white/10 bg-white/5 backdrop-blur-sm ${
              isSelected 
                ? 'ring-2 ring-cuephoria-purple bg-cuephoria-purple/10' 
                : 'hover:bg-white/10'
            }`}
            onClick={() => onStationToggle(station.id)}
          >
            <CardHeader className="pb-3">
              {imageSrc && (
                <div
                  className="relative mb-3 overflow-hidden rounded-lg border border-white/10 bg-black/25"
                  style={{ aspectRatio: "16 / 9" }}
                >
                  <img
                    src={imageSrc}
                    alt={`${station.name} image`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover opacity-95"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <Icon className="h-5 w-5" />
                  {station.name}
                </CardTitle>
                {isSelected && (
                  <Badge variant="default" className="text-xs bg-cuephoria-purple text-white">
                    Selected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <Badge 
                  variant="secondary" 
                  className={`text-xs border ${getStationTypeBadgeColor(station.type)}`}
                >
                  {getStationTypeLabel(station.type)}
                </Badge>
                <div className="text-sm font-medium text-cuephoria-lightpurple">
                  {getPriceDisplay(station)}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
