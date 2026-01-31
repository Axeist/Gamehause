import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { BRAND_NAME, LOGO_PATH } from '@/config/brand';

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
        {/* Warm neon glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-gamehaus-purple/20 to-gamehaus-magenta/20 rounded-full opacity-60 blur-md group-hover:opacity-90 transition-opacity duration-300"></div>
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
            filter: "drop-shadow(0 0 10px rgba(255, 74, 26, 0.35))",
          }}
            className={`select-none relative z-10 group-hover:drop-shadow-[0_0_14px_rgba(255,74,26,0.55)] transition-all duration-300 ${className || ""}`}
          draggable={false}
          loading="lazy"
        />
      </div>
      {!isMobile && size !== 'sm' && (
        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-lightpurple to-gamehaus-magenta font-heading group-hover:from-gamehaus-lightpurple group-hover:to-gamehaus-magenta transition-all duration-300">
          {BRAND_NAME}
        </span>
      )}
    </div>
  );
};

export default Logo;
