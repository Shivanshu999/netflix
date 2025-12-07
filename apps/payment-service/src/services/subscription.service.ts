import { razorpayClient } from "../config/razorpay.config.js";
import { logger } from "../utils/logger.utils.js";

/**
 * Cancel Razorpay subscription
 */
export async function cancelRazorpaySubscription(subscriptionId: string) {
  try {
    const subscription = await razorpayClient.subscriptions.cancel(subscriptionId);

    logger.info("Razorpay subscription cancelled", {
      subscriptionId,
      status: subscription.status,
    });

    return subscription;
  } catch (error: any) {
    logger.error("Failed to cancel Razorpay subscription", {
      error: error.message,
      subscriptionId,
    });
    throw error;
  }
}




