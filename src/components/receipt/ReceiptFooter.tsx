import React from 'react';
import { BASE_URL, BRAND_NAME, SUPPORT_EMAIL } from '@/config/brand';

const ReceiptFooter: React.FC = () => {
  const displayDomain = BASE_URL.replace(/^https?:\/\//, 'www.');

  return (
    <div className="border-t-2 border-dashed border-gray-400 pt-4 mt-6 text-center receipt-footer">
      {/* Thank You Message */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gamehaus-purple mb-1">
          Thank You for Visiting!
        </h3>
        <p className="text-xs text-gray-600">
          We hope you enjoyed your experience at {BRAND_NAME}
        </p>
      </div>
      
      {/* Terms & Conditions - With page-break protection */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4 terms-section">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Terms & Conditions:</h4>
        <ul className="text-[10px] text-gray-600 space-y-1 text-left">
          <li>• Goods once sold cannot be returned or exchanged</li>
          <li>• Please check the bill before leaving the counter</li>
          <li>• Table session charges are non-refundable</li>
          <li>• Membership benefits are subject to terms and conditions</li>
          <li>• Management reserves the right to admission</li>
        </ul>
      </div>
      
      {/* Social Media & Contact */}
      <div className="text-xs text-gray-600 mb-3">
        <p className="font-semibold mb-1">Stay Connected!</p>
        <p>Follow us on Instagram & Facebook: <span className="font-medium text-gamehaus-purple">@gamehaus</span></p>
        <p className="mt-1">Visit us: <span className="font-medium text-gamehaus-purple">{displayDomain}</span></p>
      </div>
      
      {/* Powered By */}
      <div className="text-[10px] text-gray-400 border-t border-gray-200 pt-2">
        <p>Powered by Cuephoria Tech</p>
        <p className="mt-1">For support: {SUPPORT_EMAIL}</p>
      </div>
      
      {/* Decorative Bottom */}
      <div className="mt-3 text-center">
        <p className="text-lg font-bold text-gamehaus-purple">★ ★ ★</p>
      </div>
    </div>
  );
};

export default ReceiptFooter;
