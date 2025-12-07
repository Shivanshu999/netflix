import { Request, Response, NextFunction } from 'express';
import { handlePaymentWebhook } from '../services/payment.service.js';
import { logger } from '../utils/logger.utils.js';

export async function handleWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const event = req.body.event;
    const payload = req.body.payload;

    logger.info('Webhook received', { event });

    await handlePaymentWebhook(event, payload);

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Webhook handler error:', error);
    // Always return 200 to Razorpay to prevent retries
    res.status(200).json({ status: 'error' });
  }
}

