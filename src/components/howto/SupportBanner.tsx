import React from "react";
import { Phone, Mail } from "lucide-react";

const SupportBanner: React.FC = () => (
  <div className="w-full flex justify-center mb-8">
    <div
      className="
        w-full flex flex-col md:flex-row items-center gap-3 px-5 py-4 md:py-3.5 rounded-xl
        bg-gradient-to-br from-gamehaus-purple/20 via-gamehaus-magenta/10 to-gamehaus-purple/20
        border border-gamehaus-purple/30
        backdrop-blur-sm
        max-w-3xl
        shadow-lg shadow-gamehaus-purple/10
        "
      style={{
        fontFamily: "'Poppins', 'Inter', sans-serif",
      }}
    >
      <div className="flex items-center gap-2">
        <Phone className="h-5 w-5 md:h-6 md:w-6 text-gamehaus-lightpurple flex-shrink-0" />
        <span className="text-white text-base md:text-lg font-bold leading-snug">
          <span className="font-bold text-gamehaus-lightpurple">
            Cuephoria Tech Support Line:
          </span>
          <a
            href="tel:+918667637565"
            className="ml-2 underline text-gamehaus-lightpurple font-extrabold hover:text-gamehaus-magenta transition-colors"
            style={{ textDecorationThickness: 2 }}
          >
            +91 86676 37565
          </a>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 md:h-6 md:w-6 text-gamehaus-lightpurple flex-shrink-0" />
        <a
          href="mailto:contact@cuephoria.in"
          className="text-white text-base md:text-lg font-bold leading-snug underline text-gamehaus-lightpurple hover:text-gamehaus-magenta transition-colors"
        >
          contact@cuephoria.in
        </a>
      </div>
    </div>
  </div>
);

export default SupportBanner;
