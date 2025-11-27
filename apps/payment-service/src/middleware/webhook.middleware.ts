import { Request, Response, NextFunction } from 'express';
import { verifySignature } from '../utils/crypto.utils.js';
import { config } from '../config/env.config.js';
import { logger } from '../utils/logger.utils.js';

export function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
      logger.warn('Webhook signature missing');
      return res.status(400).json({
        success: false,
        message: 'Signature missing',
      });
    }

    const body = JSON.stringify(req.body);
    const isValid = verifySignature(
      body,
      signature,
      config.razorpay.webhookSecret
    );

    if (!isValid) {
      logger.warn('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid signature',
      });
    }

    next();
  } catch (error) {
    logger.error('Webhook verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}