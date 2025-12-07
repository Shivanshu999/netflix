import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env.config.js';
import { createOrder } from '../controllers/order.controller.js';
import { verifyPayment } from '../controllers/verify.controller.js';
import { handleWebhook } from '../controllers/webhook.controller.js';
import { refundLastPayment } from '../controllers/refund.controller.js';
import { cancelSubscription } from '../controllers/subscription.controller.js';
import { getPlans } from '../controllers/plan.controller.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { verifyWebhookSignature } from '../middleware/webhook.middleware.js';
import { 
  createOrderSchema, 
  verifyPaymentSchema 
} from '../types/payment.types.js';

const router = Router();

// Rate Limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
});

// Apply rate limiting to all routes
router.use(limiter);

// Get All Plans (Public endpoint - no auth required)
router.get('/plans', getPlans);

// Create Payment Order
router.post(
  '/payment/create-order',
  validateRequest(createOrderSchema),
  createOrder
);

// Verify Payment
router.post(
  '/payment/verify',
  validateRequest(verifyPaymentSchema),
  verifyPayment
);

// Refund last successful payment for a user (within time window)
router.post('/payment/refund', refundLastPayment);

// Cancel Razorpay subscription
router.post('/payment/cancel-subscription', cancelSubscription);

// Razorpay Webhook
router.post(
  '/payment/webhook',
  verifyWebhookSignature,
  handleWebhook
);

export { router as paymentRoutes };
