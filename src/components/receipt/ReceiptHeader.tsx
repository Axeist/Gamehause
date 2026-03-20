import React, { useState } from 'react';
import { Bill, Customer } from '@/types/pos.types';
import { BRAND_NAME_UPPER, LOGO_PATH, SUPPORT_EMAIL } from '@/config/brand';

interface ReceiptHeaderProps {
  bill: Bill;
  customer: Customer;
}

const ReceiptHeader: React.FC<ReceiptHeaderProps> = ({ bill, customer }) => {
  const [logoVisible, setLogoVisible] = useState(true);
  const billDate = new Date(bill.createdAt);
  const isComplimentary = bill.paymentMethod?.toLowerCase() === 'complimentary';
  const dateStr = billDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = billDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="receipt-header invoice-header inv-header no-break">
      <div className="inv-brand-hero">
        {logoVisible && (
          <img
            src={LOGO_PATH}
            alt=""
            className="inv-brand-logo"
            width={220}
            height={100}
            aria-hidden
            onError={() => setLogoVisible(false)}
          />
        )}
        <h1 className="inv-brand-title">{BRAND_NAME_UPPER}</h1>
        <p className="inv-tagline">Premier Snooker &amp; Gaming Lounge</p>
        <h2 className="inv-doc-title">
          {isComplimentary ? 'COMPLIMENTARY RECEIPT' : 'TAX INVOICE'}
        </h2>
      </div>

      <p className="inv-address">
        40, S W Boag Rd, CIT Nagar West, T. Nagar, Chennai 600035 · +91 93451 87098 · {SUPPORT_EMAIL} · 11:00 AM – 11:00 PM daily
      </p>

      <div className="inv-meta-grid">
        <div>
          <span className="inv-muted">Invoice No</span>
          <p className="font-mono">{bill.id.substring(0, 12).toUpperCase()}</p>
        </div>
        <div className="text-right">
          <span className="inv-muted">Date &amp; time</span>
          <p>
            {dateStr} {timeStr}
          </p>
        </div>
        <div>
          <span className="inv-muted">Customer</span>
          <p title={customer.name}>{customer.name}</p>
        </div>
        <div className="text-right">
          <span className="inv-muted">Phone</span>
          <p>{customer.phone}</p>
        </div>
      </div>

      {isComplimentary && bill.compNote && (
        <div className="inv-comp-note">
          <p className="inv-muted">Reason</p>
          <p className="inv-comp-text">{bill.compNote}</p>
        </div>
      )}
    </div>
  );
};

export default ReceiptHeader;
