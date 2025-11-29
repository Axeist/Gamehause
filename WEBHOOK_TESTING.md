# Testing Webhook Implementation

## Quick Test Checklist

- [ ] Webhook endpoint is accessible
- [ ] Webhook receives test events from Razorpay
- [ ] Booking is created automatically when payment succeeds
- [ ] Booking is created even if customer doesn't return to browser
- [ ] No duplicate bookings are created

## Method 1: Test with Razorpay Dashboard (Easiest)

### Step 1: Verify Webhook is Configured
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to **Settings** → **Webhooks**
3. Find your webhook URL: `https://your-domain.com/api/razorpay/webhook`
4. Ensure it's **Active** (green status)

### Step 2: Send Test Webhook
1. Click on your webhook to view details
2. Click **Send Test Webhook** button
3. Select event: **`payment.captured`**
4. Click **Send**

### Step 3: Check Server Logs
Check your deployment logs (Vercel, etc.) for:
```
📥 Razorpay webhook received
📨 Webhook event: payment.captured
✅ Payment successful event received
📦 Creating booking from webhook (PRIMARY METHOD)
✅ Booking created successfully via webhook
```

### Step 4: Verify Response
The webhook should return `200 OK` with:
```json
{
  "ok": true,
  "received": true
}
```

## Method 2: Real Payment Test (Most Realistic)

### Step 1: Make a Test Booking
1. Go to your public booking page
2. Fill in customer details
3. Select station and time slot
4. Click "Confirm & Pay Online"
5. Use Razorpay test credentials:
   - **Card Number**: `4111 1111 1111 1111`
   - **CVV**: Any 3 digits (e.g., `123`)
   - **Expiry**: Any future date (e.g., `12/25`)
   - **Name**: Any name

### Step 2: Complete Payment
1. Complete the payment in Razorpay checkout
2. **IMPORTANT**: After payment succeeds, **DO NOT** wait for redirect
3. **Close the browser/tab immediately** (simulate customer not returning)

### Step 3: Verify Booking Created
1. Go to your admin dashboard or database
2. Check the `bookings` table
3. Look for a booking with:
   - `payment_mode = 'razorpay'`
   - `payment_txn_id` matching the payment ID
   - `status = 'confirmed'`
4. **If booking exists** → ✅ Webhook is working!

### Step 4: Check Webhook Logs
In your server logs, you should see:
```
📥 Razorpay webhook received: { hasSignature: true, payloadLength: ... }
📨 Webhook event: payment.captured
✅ Payment successful event received: { paymentId: 'pay_xxx', orderId: 'order_xxx' }
📦 Creating booking from webhook (PRIMARY METHOD)
✅ Found existing customer: [customer_id] (or Created new customer)
✅ Booking created successfully via webhook: X records
```

## Method 3: Test with UPI (Real-World Scenario)

### Step 1: Make a Test Booking
1. Go to public booking page
2. Complete booking form
3. Click "Confirm & Pay Online"
4. Select **UPI** as payment method

### Step 2: Complete Payment in UPI App
1. Scan QR code or enter UPI ID
2. Complete payment in your UPI app (PhonePe, GPay, etc.)
3. **DO NOT return to browser** - just close the UPI app

### Step 3: Wait 10-30 seconds
Give Razorpay time to process payment and send webhook

### Step 4: Verify Booking
1. Check database for new booking
2. Booking should exist even though you didn't visit success page
3. This proves webhook is working as primary method

## Method 4: Manual Webhook Test (Advanced)

### Using cURL

```bash
# Replace with your actual values
curl -X POST https://your-domain.com/api/razorpay/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: test_signature" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_test123",
          "order_id": "order_test123",
          "status": "captured",
          "amount": 10000
        }
      },
      "order": {
        "entity": {
          "id": "order_test123",
          "notes": {
            "booking_data": "eyJzZWxlY3RlZFN0YXRpb25zIjpbXSwic2VsZWN0ZWREYXRlSVNPIjoiMjAyNC0wMS0wMSIsInNsb3RzIjpbXX0="
          }
        }
      }
    }
  }'
```

**Note**: This won't create a real booking (signature won't verify), but you can test if the endpoint is accessible.

## Method 5: Check Webhook Activity in Razorpay

1. Go to **Settings** → **Webhooks**
2. Click on your webhook
3. Go to **Activity** tab
4. You'll see:
   - ✅ **Success** (200) - Webhook received and processed
   - ❌ **Failed** (4xx/5xx) - Webhook failed (check logs)

## What to Look For

### ✅ Success Indicators

1. **Server Logs Show:**
   ```
   📥 Razorpay webhook received
   ✅ Payment successful event received
   📦 Creating booking from webhook (PRIMARY METHOD)
   ✅ Booking created successfully via webhook
   ```

2. **Database Has Booking:**
   - Booking exists with `payment_txn_id`
   - Status is `confirmed`
   - Customer is created/linked

3. **Razorpay Dashboard Shows:**
   - Webhook activity with 200 status
   - Events are being received

### ❌ Failure Indicators

1. **No webhook received:**
   - Check webhook URL is correct
   - Verify webhook is active in Razorpay
   - Check if URL is publicly accessible

2. **Webhook received but booking not created:**
   - Check logs for error messages
   - Verify booking data exists in order notes
   - Check Supabase connection

3. **Signature verification failing:**
   - Verify `RAZORPAY_WEBHOOK_SECRET` is set correctly
   - Check secret matches Razorpay dashboard

## Testing the "Customer Doesn't Return" Scenario

This is the **key test** to prove webhook is working:

1. **Make a test payment**
2. **Complete payment in UPI app**
3. **Close browser immediately** (don't wait for redirect)
4. **Wait 30 seconds**
5. **Check database** - Booking should exist ✅

If booking exists, webhook is working perfectly!

## Debugging Tips

### Check Webhook Logs
```bash
# In Vercel
vercel logs

# Or check your deployment platform's logs
```

Look for:
- `📥 Razorpay webhook received` - Webhook is being called
- `✅ Payment successful event received` - Event is recognized
- `📦 Creating booking from webhook` - Booking creation started
- `✅ Booking created successfully` - Booking created

### Check Database
```sql
-- Check recent bookings
SELECT * FROM bookings 
WHERE payment_mode = 'razorpay' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if booking exists for specific payment
SELECT * FROM bookings 
WHERE payment_txn_id = 'pay_xxxxxxxxxxxxx';
```

### Common Issues

**Issue**: Webhook not receiving events
- **Solution**: Verify webhook URL is correct and publicly accessible

**Issue**: Signature verification failing
- **Solution**: Check `RAZORPAY_WEBHOOK_SECRET` environment variable

**Issue**: Booking data not found in order notes
- **Solution**: Check if `bookingData` is being sent when creating order

**Issue**: Customer creation failing
- **Solution**: Check phone number format and database constraints

## Quick Test Script

You can also add this to your codebase for quick testing (remove in production):

```typescript
// Test endpoint (add to api/razorpay/test-webhook.ts)
export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  
  // This just tests if webhook endpoint is accessible
  return new Response(JSON.stringify({ 
    ok: true, 
    message: "Webhook endpoint is accessible",
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
```

Then test with:
```bash
curl https://your-domain.com/api/razorpay/test-webhook
```

## Success Criteria

✅ **Webhook is working if:**
1. Razorpay dashboard shows webhook events with 200 status
2. Server logs show webhook received and booking created
3. Database has booking even when customer doesn't return
4. No duplicate bookings are created

If all 4 criteria are met, your webhook implementation is working perfectly! 🎉

