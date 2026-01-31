import React from "react";
import { BookOpenText } from "lucide-react";
import { BRAND_NAME, LOGO_PATH } from "@/config/brand";

const HowToBanner: React.FC = () => (
  <div
    className="
      w-full flex items-center gap-6
      bg-gradient-to-br from-black/80 via-gamehaus-purple/40 to-black/80
      rounded-xl shadow-xl relative px-5 pt-5 pb-4 mb-7 border border-gamehaus-purple/20
      "
    style={{
      boxShadow:
        "0 2px 20px 0 rgba(255,74,26,0.12), 0 1.5px 14px 0 rgba(255,122,42,0.15)",
    }}
  >
    {/* Logo image */}
    <div className="flex-shrink-0">
      <img
        src={LOGO_PATH}
        alt="Gamehaus – Premier Snooker & Gaming Lounge"
        className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover shadow border-2 border-gamehaus-purple/20 bg-black/60"
        loading="lazy"
      />
    </div>
    {/* Content */}
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-2 mb-0.5">
        <BookOpenText className="h-6 w-6 text-gamehaus-lightpurple" />
        <h1 className="text-2xl font-heading font-bold text-white tracking-tight">
          Welcome to{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-lightpurple via-gamehaus-magenta to-gamehaus-purple font-heading font-bold">
            {BRAND_NAME}
          </span>
          !
        </h1>
      </div>
      <p className="text-base md:text-lg font-quicksand text-white/85 mt-0.5 leading-normal">
        Complete management system for your gaming lounge - POS, stations, products, customers, bookings, tournaments, and more{" "}
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-lightpurple to-gamehaus-purple font-heading font-semibold">
          all in one place
        </span>
        .<br />
        <span className="text-white/75">
          This comprehensive guide covers every feature to help you master the system.
        </span>
        <br />
        <span className="text-gamehaus-lightpurple font-semibold">Tip:</span>
        <span className="ml-1 text-white/75">
          Click any section below to expand and learn more!
        </span>
      </p>
    </div>
  </div>
);

export default HowToBanner;
