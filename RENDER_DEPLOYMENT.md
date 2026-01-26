# Render Deployment Configuration

## Issue
Render is trying to run `node dist/index.js` but this file doesn't exist in a monorepo structure.

## Solution

### For Next.js App Service

1. Go to your Render dashboard
2. Navigate to your service (the one that's failing)
3. Go to **Settings** → **Build & Deploy**
4. Update the **Start Command** from:
   ```
   node dist/index.js
   ```
   to:
   ```
   cd apps/netflix-app && npm start
   ```
   OR simply:
   ```
   npm start
   ```
   (The root package.json now has a start script that handles this)

5. Save the changes
6. The service will automatically redeploy

### For Payment Service (if separate)

If you have a separate service for the payment API, use:
```
cd apps/payment-service && node dist/index.js
```

## Alternative: Using the start script

You can also use the shell script:
```
./start.sh
```

Make sure the script is executable (it should be after git clone).

## Verification

After updating the start command, check the logs to ensure:
- ✅ Build completes successfully (already working)
- ✅ Service starts with the correct command
- ✅ Next.js app runs on the configured port (usually 3000 or PORT env var)
