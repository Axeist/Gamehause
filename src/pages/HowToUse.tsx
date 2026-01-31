
import React from "react";
import HowToBanner from "../components/howto/HowToBanner";
import HowToAccordion from "../components/howto/HowToAccordion";
import HowToFAQ from "../components/howto/HowToFAQ";
import SupportBanner from "../components/howto/SupportBanner";
const HowToUse: React.FC = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center px-2 md:px-3 py-7 font-quicksand bg-transparent text-base">
    <div className="w-full max-w-3xl">
      {/* Subtle hero/banner */}
      <HowToBanner />

      {/* Support/Contact Banner */}
      <SupportBanner />

      {/* Instructions */}
      <HowToAccordion />

      {/* FAQ */}
      <HowToFAQ />

      <div className="w-full flex justify-center mt-10">
        <div className="text-xs text-gamehaus-lightpurple/70 px-4 py-3 text-center font-quicksand bg-gamehaus-purple/5 rounded-lg border border-gamehaus-purple/20 max-w-2xl">
          <p className="mb-2">
            <b className="text-gamehaus-lightpurple">Security Note:</b> You will be automatically logged out after 5 hours of inactivity for security. Always save your work and log in daily for best results.
          </p>
          <p>
            <b className="text-gamehaus-lightpurple">Need Help?</b> Contact your administrator or reach out to{" "}
            <b className="text-gamehaus-magenta">Cuephoria Tech Support Line</b> at{" "}
            <a href="tel:+918667637565" className="underline text-gamehaus-magenta hover:text-gamehaus-lightpurple">
              +91 86676 37565
            </a>
            {" "}or email{" "}
            <a href="mailto:contact@cuephoria.in" className="underline text-gamehaus-magenta hover:text-gamehaus-lightpurple">
              contact@cuephoria.in
            </a>.
          </p>
        </div>
      </div>
    </div>
  </div>
);
export default HowToUse;
