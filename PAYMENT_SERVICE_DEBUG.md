# Payment Service Connection Debugging

## Issue
Even though `PAYMENT_SERVICE_URL` is set to `https://netflix-2-vsvc.onrender.com`, requests are timing out.

## Possible Causes

### 1. Payment Service Not Running
The payment service at `https://netflix-2-vsvc.onrender.com` might not be running or accessible.

**Check:**
```bash
curl https://netflix-2-vsvc.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "payment-service",
  "timestamp": "...",
  "uptime": ...
}
```

### 2. CORS Configuration
The payment service CORS might not allow requests from your Next.js app domain.

**Check payment service environment:**
- `CORS_ORIGIN` should include your Next.js app URL (e.g., `https://your-nextjs-app.onrender.com`)

**Current default:** `http://localhost:3000` (only allows localhost)

### 3. Environment Variable Not Loaded
Next.js might not be reading the environment variable correctly.

**Check Render logs** for:
```
PAYMENT_SERVICE_URL: https://netflix-2-vsvc.onrender.com
```

If you see `http://localhost:3002`, the env var isn't being read.

### 4. Payment Service Slow Response
The service might be taking longer than 5 seconds to respond (cold start on Render).

**Solution:** I've increased the timeout to 15 seconds in the code.

## Debugging Steps

### Step 1: Verify Payment Service is Running
```bash
# Test health endpoint
curl https://netflix-2-vsvc.onrender.com/health

# Test plans endpoint
curl https://netflix-2-vsvc.onrender.com/api/v1/plans
```

### Step 2: Check Render Logs
1. Go to your **Next.js app** service on Render
2. Check **Logs** tab
3. Look for:
   - `PAYMENT_SERVICE_URL: ...` (should show the Render URL)
   - Any connection errors

### Step 3: Check Payment Service Logs
1. Go to your **Payment Service** on Render
2. Check **Logs** tab
3. Verify:
   - Service started successfully
   - No errors during startup
   - CORS origin is configured correctly

### Step 4: Verify Environment Variables

**In Next.js App Service (Render):**
- `PAYMENT_SERVICE_URL` = `https://netflix-2-vsvc.onrender.com`

**In Payment Service (Render):**
- `CORS_ORIGIN` = Your Next.js app URL (e.g., `https://your-nextjs-app.onrender.com`)
- Or set to `*` for development (not recommended for production)

## Quick Fixes

### Fix 1: Update CORS in Payment Service
If your Next.js app is on Render, update the payment service's `CORS_ORIGIN`:

1. Go to Payment Service → Environment
2. Add/Update: `CORS_ORIGIN` = `https://your-nextjs-app.onrender.com`
3. Redeploy

### Fix 2: Verify Payment Service URL
Make sure the URL is correct:
- No trailing slash: `https://netflix-2-vsvc.onrender.com` ✅
- Not: `https://netflix-2-vsvc.onrender.com/` ❌

### Fix 3: Check Payment Service Status
The service might be sleeping (Render free tier). First request after sleep can take 30+ seconds.

## Testing Locally

To test if the issue is with Render or the code:

```bash
# Set env var locally
export PAYMENT_SERVICE_URL=https://netflix-2-vsvc.onrender.com

# Run Next.js app
cd apps/netflix-app
npm run dev

# Try accessing plans
curl http://localhost:3000/api/subscription/plans
```

## Next Steps

After deploying the updated code with better logging:
1. Check Render logs for the debug output
2. Verify which URL is actually being used
3. Test the payment service directly with curl
4. Update CORS if needed
