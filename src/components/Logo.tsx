import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * This custom logo component renders the NerfTurf logo for all use cases.
 */
interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /**
   * Use the NerfTurf brand graphic with green theme styling
   * for all logo purposes, scaling with prop or parent container
   */
}

const imgMap = {
  sm: 32,
  md: 52,
  lg: 80,
};

const Logo: React.FC<LogoProps> = ({ size = 'md', className }) => {
  const isMobile = useIsMobile();
  // Prefer smaller logo for mobile regardless of size prop (for navbar fit)
  const height = isMobile ? 36 : imgMap[size] || 52;
  const width = height * 1.2; // slightly wider than tall for logo aspect ratio

  return (
    <div className="relative inline-flex items-center gap-2 group">
      <div className="relative">
        {/* Green glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-nerfturf-purple/20 to-nerfturf-magenta/20 rounded-full opacity-60 blur-md group-hover:opacity-90 transition-opacity duration-300"></div>
        <img
          src="https://iili.io/KpFz28x.jpg"
          alt="NerfTurf - Premier Snooker & 8-Ball"
          height={height}
          width={width}
          style={{
            objectFit: "contain",
            background: "transparent",
            maxHeight: height, 
            maxWidth: width,
            filter: "drop-shadow(0 0 8px rgba(110, 89, 165, 0.4))",
          }}
          className={`select-none relative z-10 group-hover:drop-shadow-[0_0_12px_rgba(34,197,94,0.6)] transition-all duration-300 ${className || ""}`}
          draggable={false}
          loading="lazy"
        />
      </div>
      {!isMobile && size !== 'sm' && (
        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-nerfturf-lightpurple to-nerfturf-magenta font-heading group-hover:from-nerfturf-lightpurple group-hover:to-nerfturf-magenta transition-all duration-300">
          NerfTurf
        </span>
      )}
    </div>
  );
};

export default Logo;
