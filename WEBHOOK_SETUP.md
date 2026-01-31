# Razorpay Webhook Setup Guide

## Overview

The booking system uses **Razorpay webhooks as the PRIMARY method** to create bookings automatically when payments succeed. This ensures bookings are created even if customers don't return to the browser after completing payment in their UPI app.

## How It Works

1. **Customer initiates payment** → Booking data is stored in Razorpay order notes
2. **Customer pays in UPI app** → Payment is processed by Razorpay
3. **Razorpay sends webhook** → Our webhook handler receives `payment.captured` event
4. **Webhook creates booking** → Booking is automatically created in database
5. **Success page (fallback)** → If customer returns, success page verifies booking exists

## Webhook Configuration Steps

### 1. Get Your Webhook URL

Your webhook endpoint is:
```
https://your-domain.com/api/razorpay/webhook
```

Replace `your-domain.com` with your actual domain (e.g., `gamehaus.co.in`).

### 2. Configure in Razorpay Dashboard

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **Webhooks**
3. Click **+ Add New Webhook**
4. Enter your webhook URL: `https://your-domain.com/api/razorpay/webhook`
5. Select the following events:
   - ✅ `payment.captured` (Primary event - fires when payment succeeds)
   - ✅ `order.paid` (Backup event)
   - ✅ `payment.authorized` (Optional - for card payments)
   - ✅ `payment.failed` (Optional - for monitoring failed payments)
6. Click **Create Webhook**

### 3. Get Webhook Secret

After creating the webhook:
1. Click on your webhook to view details
2. Copy the **Webhook Secret** (starts with `whsec_`)
3. Add it to your environment variables

### 4. Set Environment Variables

Add the webhook secret to your deployment platform (Vercel, etc.):

**For Test Mode:**
```
RAZORPAY_WEBHOOK_SECRET_TEST=whsec_xxxxxxxxxxxxx
```

**For Live Mode:**
```
RAZORPAY_WEBHOOK_SECRET_LIVE=whsec_xxxxxxxxxxxxx
```

**Or use a single secret for both:**
```
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 5. Verify Webhook is Working

1. Make a test payment
2. Check your server logs for webhook events:
   ```
   📥 Razorpay webhook received
   ✅ Payment successful event received
   📦 Creating booking from webhook (PRIMARY METHOD)
   ✅ Booking created successfully via webhook
   ```
3. Verify booking exists in database even if you don't visit success page

## Testing the Webhook

### Using Razorpay Dashboard

1. Go to **Settings** → **Webhooks**
2. Click on your webhook
3. Click **Send Test Webhook**
4. Select event: `payment.captured`
5. Check your server logs to verify it's received

### Manual Testing

1. Make a test booking and payment
2. Complete payment in UPI app
3. **Don't return to browser** (close the app)
4. Check database - booking should exist
5. This proves webhook is working as primary method

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook URL is correct** - Must be publicly accessible HTTPS URL
2. **Verify webhook is active** - Check Razorpay dashboard, webhook should show as "Active"
3. **Check server logs** - Look for webhook requests in your deployment logs
4. **Test webhook manually** - Use Razorpay's "Send Test Webhook" feature

### Webhook Receiving Events But Booking Not Created

1. **Check booking data in order notes** - Webhook logs will show if booking data is missing
2. **Verify Supabase connection** - Check if webhook can connect to database
3. **Check error logs** - Look for specific error messages in webhook handler
4. **Verify customer creation** - Check if customer phone number is valid

### Signature Verification Failing

1. **Verify webhook secret is correct** - Must match the secret from Razorpay dashboard
2. **Check environment variables** - Ensure secret is set correctly for test/live mode
3. **Check webhook secret format** - Should start with `whsec_`

## Architecture

```
┌─────────────────┐
│  Customer Pays  │
│   in UPI App    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Razorpay       │
│  Processes      │
│  Payment        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Webhook        │─────▶│  Create Booking  │
│  (PRIMARY)      │      │  in Database     │
└─────────────────┘      └──────────────────┘
         │
         │ (if customer returns)
         ▼
┌─────────────────┐
│  Success Page   │
│  (FALLBACK)     │
│  Verifies       │
│  Booking Exists │
└─────────────────┘
```

## Key Points

- ✅ **Webhook is PRIMARY** - Creates bookings automatically
- ✅ **Success page is FALLBACK** - Only creates if webhook didn't fire
- ✅ **Works even if customer doesn't return** - Like Swiggy/Zomato
- ✅ **Idempotent** - Won't create duplicate bookings
- ✅ **Secure** - Webhook signature verification enabled

## Support

If you encounter issues:
1. Check server logs for webhook events
2. Verify webhook configuration in Razorpay dashboard
3. Test with Razorpay's test webhook feature
4. Check environment variables are set correctly

