#!/bin/bash
# Start script for Render deployment
# This script determines which service to start based on the service type

# Check if this is the Next.js app (netflix-app)
if [ -d "apps/netflix-app/.next" ]; then
  echo "Starting Next.js app..."
  cd apps/netflix-app
  npm start
# Check if this is the payment service
elif [ -d "apps/payment-service/dist" ]; then
  echo "Starting payment service..."
  cd apps/payment-service
  node dist/index.js
else
  echo "Error: Could not determine which service to start"
  exit 1
fi
