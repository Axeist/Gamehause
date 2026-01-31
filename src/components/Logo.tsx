import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { LOGO_PATH } from '@/config/brand';

/**
 * This custom logo component renders the Gamehaus logo for all use cases.
 */
interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /**
   * Use the Gamehaus brand graphic for all logo purposes,
   * scaling with prop or parent container.
   */
}

const imgMap = {
  sm: 38,
  md: 64,
  lg: 96,
};

const Logo: React.FC<LogoProps> = ({ size = 'md', className }) => {
  const isMobile = useIsMobile();
  // Prefer smaller logo for mobile regardless of size prop (for navbar fit)
  const height = isMobile ? 44 : imgMap[size] || 64;
  const width = height; // logo asset is square

  return (
    <div className="relative inline-flex items-center gap-2 group">
      <div className="relative">
        {/* Warm neon glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-gamehaus-purple/20 to-gamehaus-magenta/20 rounded-xl opacity-60 blur-md group-hover:opacity-90 transition-opacity duration-300"></div>
        <div
          className="relative z-10 rounded-xl overflow-hidden"
          style={{ height, width }}
        >
          <img
            src={LOGO_PATH}
            alt="Gamehaus – Premier Snooker & Gaming Lounge"
            height={height}
            width={width}
            style={{
              objectFit: "contain",
              background: "transparent",
              maxHeight: height,
              maxWidth: width,
              // Hide extra padding in the PNG (slight zoom-in)
              transform: "scale(1.12)",
              transformOrigin: "center",
              filter: "drop-shadow(0 0 10px rgba(255, 74, 26, 0.35))",
            }}
            className={`select-none h-full w-full object-contain mix-blend-screen transition-all duration-300 group-hover:drop-shadow-[0_0_14px_rgba(255,74,26,0.55)] ${className || ""}`}
            draggable={false}
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
};

export default Logo;
