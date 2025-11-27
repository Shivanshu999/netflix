import { PrismaClient } from "@prisma/client";
import { razorpayClient } from "../config/razorpay.config.js";
import { config } from "../config/env.config.js";
import { publishPaymentEvent } from "./rabbitmq.service.js";
import { logger } from "../utils/logger.utils.js";

const prisma = new PrismaClient();

/**
 * Check for subscriptions expiring soon and create renewal orders
 * This should be run as a cron job (e.g., daily)
 */
export async function processAutoRenewals() {
  try {
    // Find subscriptions expiring in the next 3 days that have auto-renew enabled
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        autoRenew: true,
        isActive: true,
        expiresAt: {
          lte: threeDaysFromNow,
          gte: new Date(), // Not already expired
        },
      },
    });

    logger.info(`Found ${expiringSubscriptions.length} subscriptions to renew`);

    for (const subscription of expiringSubscriptions) {
      try {
        // Check if there's already a pending renewal transaction
        const recentTransaction = await prisma.transaction.findFirst({
          where: {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            status: {
              in: ["pending", "success"],
            },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (recentTransaction) {
          logger.info(`Skipping renewal for ${subscription.userId} - recent transaction exists`);
          continue;
        }

        // Get plan details (you might want to store this in a config)
        const planAmounts: Record<string, number> = {
          monthly: 499,
          yearly: 4999,
        };

        const amount = planAmounts[subscription.planId] || 499;

        // Create renewal order directly with Razorpay
        const timestamp = Date.now().toString(36);
        const receipt = `renew_${timestamp}_${subscription.planId}`.slice(0, 40);
        
        const order = await razorpayClient.orders.create({
          amount: amount * 100, // Convert to paise
          currency: "INR",
          receipt,
          notes: {
            userId: subscription.userId,
            planId: subscription.planId,
            renewal: "true",
            subscriptionId: subscription.id.toString(),
          },
        });

        logger.info(`Renewal order created for ${subscription.userId}`, {
          orderId: order.id,
          planId: subscription.planId,
        });

        // Publish renewal event
        await publishPaymentEvent({
          type: "payment.subscription_renewed",
          paymentId: order.id,
          userId: subscription.userId,
          planId: subscription.planId,
          amount,
          currency: "INR",
          orderId: order.id,
          subscriptionId: subscription.razorpaySubscriptionId || undefined,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        logger.error(`Failed to process renewal for ${subscription.userId}`, {
          error: error.message,
          subscriptionId: subscription.id,
        });
      }
    }
  } catch (error: any) {
    logger.error("Error processing auto-renewals", {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Check for trial periods ending and notify users
 */
export async function processTrialExpirations() {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find subscriptions with trials ending tomorrow
    const expiringTrials = await prisma.subscription.findMany({
      where: {
        trialEndsAt: {
          gte: now,
          lte: tomorrow,
        },
        isActive: true,
      },
    });

    logger.info(`Found ${expiringTrials.length} trials expiring soon`);

    // Here you could send email notifications, etc.
    for (const subscription of expiringTrials) {
      logger.info(`Trial expiring for ${subscription.userId}`, {
        trialEndsAt: subscription.trialEndsAt,
      });
      // TODO: Send email notification
    }
  } catch (error: any) {
    logger.error("Error processing trial expirations", {
      error: error.message,
    });
  }
}

