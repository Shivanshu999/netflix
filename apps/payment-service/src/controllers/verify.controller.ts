import { Request, Response, NextFunction } from 'express';
import { verifyPaymentSignature } from '../services/payment.service.js';
import { logger } from '../utils/logger.utils.js';
import type { VerifyPaymentRequest } from '../types/payment.types.js';

export async function verifyPayment(
  req: Request<{}, {}, VerifyPaymentRequest>,
  res: Response,
  next: NextFunction
) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    logger.info('Verifying payment', { 
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id 
    });

    const result = await verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    res.status(200).json({
      success: result.verified,
      message: result.verified 
        ? 'Payment verified successfully' 
        : 'Payment verification failed',
      data: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      },
    });
  } catch (error) {
    logger.error('Error verifying payment:', error);
    next(error);
  }
}