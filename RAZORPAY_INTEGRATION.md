# Razorpay Integration Guide

## ✅ Completed Integration

This document outlines the Razorpay integration that replaces PhonePe payment gateway.

## Changes Made

### 1. Removed PhonePe Integration
- ✅ Deleted all PhonePe API routes (`api/phonepe/*`)
- ✅ Removed PhonePe payment method from frontend
- ✅ Cleaned up PhonePe-related code

### 2. Added Razorpay Integration
- ✅ Added `razorpay` package (v2.9.6) to `package.json`
- ✅ Created Razorpay API routes:
  - `api/razorpay/create-order.ts` - Creates payment orders
  - `api/razorpay/get-key-id.ts` - Returns public Key ID for frontend
  - `api/razorpay/verify-payment.ts` - Verifies payment status
  - `api/razorpay/callback.ts` - Handles payment callbacks
  - `api/razorpay/webhook.ts` - Handles webhook events

### 3. Updated Frontend
- ✅ Updated `PublicBooking.tsx` to use Razorpay instead of PhonePe
- ✅ Updated `PublicPaymentSuccess.tsx` for Razorpay payment verification
- ✅ Updated `PublicPaymentFailed.tsx` to show Razorpay errors
- ✅ Added Razorpay script loading dynamically

## Environment Variables Setup

### Required Environment Variables

You need to set up environment variables for Razorpay. The system supports both **test** and **live** modes with automatic switching.

#### Option 1: Separate Test/Live Keys (Recommended)

**For Test Mode:**
```env
RAZORPAY_MODE=test
RAZORPAY_KEY_ID_TEST=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET_TEST=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET_TEST=xxxxxxxxxxxxxxxxxxxxxxxx  # Optional
```

**For Live Mode:**
```env
RAZORPAY_MODE=live
RAZORPAY_KEY_ID_LIVE=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET_LIVE=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET_LIVE=xxxxxxxxxxxxxxxxxxxxxxxx  # Optional
```

#### Option 2: Single Key Configuration (Alternative)

```env
RAZORPAY_MODE=test  # or "live"
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx  # Optional
```

### How to Get Razorpay Keys

1. **Test Mode Keys:**
   - Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
   - Go to **Settings → API Keys**
   - Generate Key (if needed)
   - Copy **Key ID** (starts with `rzp_test_`) and **Key Secret**

2. **Live Mode Keys:**
   - Switch to **Live Mode** (top right in dashboard)
   - Go to **Settings → API Keys**
   - Generate Key (if needed)
   - Copy **Key ID** (starts with `rzp_live_`) and **Key Secret**

3. **Webhook Secret:**
   - Go to **Settings → Webhooks**
   - Add webhook URL: `https://yourdomain.com/api/razorpay/webhook`
   - Select events: `payment.captured`, `payment.failed`, `order.paid`
   - Copy webhook secret

## Installation

After setting up environment variables, install the Razorpay package:

```bash
npm install
# or
yarn install
```

## Testing

### Test Mode Testing

1. Set `RAZORPAY_MODE=test` in your environment
2. Use Razorpay test cards:
   - **Success:** Card number `4111 1111 1111 1111`, any future expiry, any CVV
   - **Failure:** Card number `4000 0000 0000 0002`
3. Test the complete payment flow

### Live Mode Testing

1. Set `RAZORPAY_MODE=live` in your environment
2. Use real payment methods (start with small amounts)
3. Test complete flow end-to-end

## Key Features

### Test/Live Mode Switching

The system automatically switches between test and live modes based on the `RAZORPAY_MODE` environment variable:

- `RAZORPAY_MODE=test` → Uses test keys
- `RAZORPAY_MODE=live` → Uses live keys

### Payment Flow

1. User selects "Pay Online" option
2. Razorpay script loads dynamically
3. Order is created on server
4. Razorpay checkout modal opens
5. User completes payment
6. Payment is verified on success page
7. Booking is created in database

### Error Handling

- Payment failures redirect to `/public/payment/failed`
- Payment verification failures show appropriate messages
- Network errors are handled gracefully

## API Routes

### `POST /api/razorpay/create-order`
Creates a Razorpay order for payment.

**Request:**
```json
{
  "amount": 100.00,
  "receipt": "CUE-1234567890-ABC123",
  "notes": {
    "customer_name": "John Doe",
    "customer_phone": "9876543210"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "orderId": "order_xxxxxxxxxxxxx",
  "amount": 10000,
  "currency": "INR"
}
```

### `GET /api/razorpay/get-key-id`
Returns the public Razorpay Key ID for frontend.

**Response:**
```json
{
  "ok": true,
  "keyId": "rzp_test_xxxxxxxxxxxxx",
  "mode": "test"
}
```

### `POST /api/razorpay/verify-payment`
Verifies payment status with Razorpay.

**Request:**
```json
{
  "razorpay_payment_id": "pay_xxxxxxxxxxxxx",
  "razorpay_order_id": "order_xxxxxxxxxxxxx",
  "razorpay_signature": "signature_xxxxxxxxxxxxx"
}
```

**Response:**
```json
{
  "ok": true,
  "success": true,
  "paymentId": "pay_xxxxxxxxxxxxx",
  "status": "captured"
}
```

## Important Notes

1. **Runtime Configuration:**
   - `create-order.ts` and `verify-payment.ts` use **Node.js runtime** (not Edge) to support Razorpay SDK
   - `get-key-id.ts`, `callback.ts`, and `webhook.ts` use **Edge runtime**

2. **Amount Format:**
   - Amounts are automatically converted to **paise** (multiply by 100)
   - Minimum amount: ₹1.00 (100 paise)

3. **Receipt ID:**
   - Limited to 40 characters
   - Automatically truncated if longer

4. **Notes:**
   - Each note value limited to 256 characters
   - Invalid notes are filtered out

5. **Payment Verification:**
   - Payments are verified by fetching status from Razorpay API
   - Success statuses: `captured` or `authorized`

## Troubleshooting

### Common Issues

1. **"Razorpay SDK not found"**
   - Ensure `razorpay` package is installed: `npm install`
   - Check that Node.js runtime is used (not Edge) for SDK routes

2. **"Missing env: RAZORPAY_KEY_ID_TEST"**
   - Set all required environment variables
   - Ensure `RAZORPAY_MODE` is set correctly

3. **"Amount must be at least ₹1.00"**
   - Amount is automatically converted to paise
   - Ensure amount is greater than 0

4. **"Payment verification failed"**
   - Check payment status in Razorpay dashboard
   - Verify payment ID is correct

5. **"Razorpay script not loaded"**
   - Check browser console for script loading errors
   - Ensure internet connection is available

## Production Deployment

1. Set all production environment variables in your hosting platform
2. Never commit API keys to version control
3. Set up webhook URL in Razorpay dashboard
4. Test with small amounts first
5. Monitor API logs for errors

## Support

For issues or questions:
- Check Razorpay [Documentation](https://razorpay.com/docs/)
- Review API logs for detailed error messages
- Contact support if payment verification fails repeatedly

