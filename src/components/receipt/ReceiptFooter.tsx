import React from 'react';
import { BASE_URL, BRAND_NAME, SUPPORT_EMAIL } from '@/config/brand';

const ReceiptFooter: React.FC = () => {
  const displayDomain = BASE_URL.replace(/^https?:\/\//, 'www.');

  return (
    <div className="receipt-footer invoice-footer inv-footer terms-section no-break">
      <p className="inv-footer-terms">
        All sales are final. Table sessions are non-refundable. Management reserves admission rights.
      </p>
      <p className="inv-footer-line">
        {BRAND_NAME} · @gamehaus · {displayDomain}
      </p>
      <p className="inv-footer-support">Support: {SUPPORT_EMAIL}</p>
    </div>
  );
};

export default ReceiptFooter;
