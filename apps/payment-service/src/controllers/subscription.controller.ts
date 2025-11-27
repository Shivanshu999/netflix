import { Request, Response, NextFunction } from 'express';
import { cancelRazorpaySubscription } from '../services/subscription.service.js';
import { logger } from '../utils/logger.utils.js';

/**
 * Cancel Razorpay subscription
 */
export async function cancelSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required',
      });
    }

    const result = await cancelRazorpaySubscription(subscriptionId);

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error('Error cancelling subscription:', error);
    next(error);
  }
}




