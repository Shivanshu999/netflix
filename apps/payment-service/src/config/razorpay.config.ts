// import dotenv from "dotenv";
// dotenv.config();
// import Razorpay from "razorpay"



// if (!process.env.RAZOR_PAY_TEST_API_KEY || !process.env.RAZOR_PAY_TEST_KEY_SECRET) {
//   throw new Error("Razorpay API keys are missing in environment variables");
// }

// export const razorpayInstance = new Razorpay({
//   key_id: process.env.RAZOR_PAY_TEST_API_KEY,
//   key_secret: process.env.RAZOR_PAY_TEST_KEY_SECRET,
// });


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