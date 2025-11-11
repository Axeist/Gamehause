import React from "react";
import { Phone, Mail } from "lucide-react";

const SupportBanner: React.FC = () => (
  <div className="w-full flex justify-center mb-8">
    <div
      className="
        w-full flex flex-col md:flex-row items-center gap-3 px-5 py-4 md:py-3.5 rounded-xl
        bg-gradient-to-br from-nerfturf-purple/20 via-nerfturf-magenta/10 to-nerfturf-purple/20
        border border-nerfturf-purple/30
        backdrop-blur-sm
        max-w-3xl
        shadow-lg shadow-nerfturf-purple/10
        "
      style={{
        fontFamily: "'Poppins', 'Inter', sans-serif",
      }}
    >
      <div className="flex items-center gap-2">
        <Phone className="h-5 w-5 md:h-6 md:w-6 text-nerfturf-lightpurple flex-shrink-0" />
        <span className="text-white text-base md:text-lg font-bold leading-snug">
          <span className="font-bold text-nerfturf-lightpurple">
            Cuephoria Tech Support Line:
          </span>
          <a
            href="tel:+918667637565"
            className="ml-2 underline text-nerfturf-lightpurple font-extrabold hover:text-nerfturf-magenta transition-colors"
            style={{ textDecorationThickness: 2 }}
          >
            +91 86676 37565
          </a>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 md:h-6 md:w-6 text-nerfturf-lightpurple flex-shrink-0" />
        <a
          href="mailto:contact@cuephoria.in"
          className="text-white text-base md:text-lg font-bold leading-snug underline text-nerfturf-lightpurple hover:text-nerfturf-magenta transition-colors"
        >
          contact@cuephoria.in
        </a>
      </div>
    </div>
  </div>
);

export default SupportBanner;
