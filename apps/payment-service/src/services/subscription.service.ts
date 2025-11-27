import { razorpayClient } from "../config/razorpay.config.js";
import { logger } from "../utils/logger.utils.js";
import { publishPaymentEvent } from "./rabbitmq.service.js";

interface CreateSubscriptionParams {
  userId: string;
  planId: string;
  amount: number;
  currency?: string;
  customerId?: string;
  trialDays?: number;
}

/**
 * Create Razorpay subscription for recurring payments
 */
export async function createRazorpaySubscription(params: CreateSubscriptionParams) {
  const { userId, planId, amount, currency = "INR", customerId, trialDays = 0 } = params;

  // Determine billing frequency based on plan
  const interval = planId === "yearly" ? "yearly" : "monthly";
  const totalCount = planId === "yearly" ? 1 : 12; // Yearly = 1 payment, Monthly = 12 payments

  const subscriptionOptions: any = {
    plan_id: planId, // You'll need to create plans in Razorpay dashboard first
    customer_notify: 1,
    total_count: totalCount,
    start_at: Math.floor(Date.now() / 1000) + (trialDays * 24 * 60 * 60), // Start after trial
    notes: {
      userId,
      planId,
    },
  };

  // If customer exists, use it; otherwise Razorpay will create one
  if (customerId) {
    subscriptionOptions.customer_id = customerId;
  }

  try {
    const subscription = await razorpayClient.subscriptions.create(subscriptionOptions);

    logger.info("Razorpay subscription created", {
      subscriptionId: subscription.id,
      userId,
      planId,
    });

    return {
      subscriptionId: subscription.id,
      customerId: subscription.customer_id,
      status: subscription.status,
      currentStart: subscription.current_start,
      currentEnd: subscription.current_end,
    };
  } catch (error: any) {
    logger.error("Failed to create Razorpay subscription", {
      error: error.message,
      userId,
      planId,
    });
    throw error;
  }
}

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

/**
 * Pause Razorpay subscription (for trial periods)
 */
export async function pauseRazorpaySubscription(subscriptionId: string) {
  try {
    const subscription = await razorpayClient.subscriptions.pause(subscriptionId, {
      pause_at: "now",
    });

    logger.info("Razorpay subscription paused", {
      subscriptionId,
      status: subscription.status,
    });

    return subscription;
  } catch (error: any) {
    logger.error("Failed to pause Razorpay subscription", {
      error: error.message,
      subscriptionId,
    });
    throw error;
  }
}

/**
 * Resume Razorpay subscription
 */
export async function resumeRazorpaySubscription(subscriptionId: string) {
  try {
    const subscription = await razorpayClient.subscriptions.resume(subscriptionId, {
      resume_at: "now",
    });

    logger.info("Razorpay subscription resumed", {
      subscriptionId,
      status: subscription.status,
    });

    return subscription;
  } catch (error: any) {
    logger.error("Failed to resume Razorpay subscription", {
      error: error.message,
      subscriptionId,
    });
    throw error;
  }
}




