import Razorpay from 'razorpay';
import { config } from './env.config.js';

export const razorpayClient = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

export const RAZORPAY_CONFIG = {
  currency: 'INR',
  defaultPlanDuration: 30, // days
  plans: {
    basic: {
      price: 199,
      features: ['HD', '1 Screen', 'Mobile + Tablet'],
    },
    standard: {
      price: 499,
      features: ['Full HD', '2 Screens', 'Mobile + Tablet + Computer'],
    },
    premium: {
      price: 649,
      features: ['4K + HDR', '4 Screens', 'All Devices'],
    },
  },
};