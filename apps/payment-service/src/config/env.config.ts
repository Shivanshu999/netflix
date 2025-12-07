// src/config/env.config.ts

import dotenv from "dotenv";
dotenv.config();
console.log('📋 Raw Environment Variables:');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '[HIDDEN]' : 'undefined');
console.log('PORT:', process.env.PORT);



function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Missing environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}
export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3002),
  apiPrefix: process.env.API_PREFIX || "/api/v1",

  razorpay: {
    keyId: required("RAZORPAY_KEY_ID"),
    keySecret: required("RAZORPAY_KEY_SECRET"),
    webhookSecret: required("RAZORPAY_WEBHOOK_SECRET"),
  },

  rabbitmq: {
    url: required("RABBITMQ_URL"),
    paymentQueue: process.env.PAYMENT_QUEUE || "payment_events",
  },

  database: {
    url: required("DATABASE_URL"),
  },

  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
    maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  },
} as const;

export type Config = typeof config;