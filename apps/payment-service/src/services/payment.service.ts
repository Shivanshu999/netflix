import { razorpayClient } from "../config/razorpay.config.js";
import { verifySignature } from "../utils/crypto.utils.js";
import { config } from "../config/env.config.js";
import { publishPaymentEvent } from "./rabbitmq.service.js";
import { logger } from "../utils/logger.utils.js";
import type { PaymentEvent } from "../types/payment.types.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CreateOrderParams {
  userId: string;
  planId: string;
  amount: number;
  currency: string;
}

interface VerifySignatureParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}


/**
 * ================================
 * CREATE PAYMENT ORDER
 * ================================
 */
export async function createPaymentOrder(params: CreateOrderParams) {
  const { userId, planId, amount, currency } = params;

  // Generate short receipt (max 40 chars)
  // Full details are preserved in notes object
  const timestamp = Date.now().toString(36);
  const receipt = `ord_${timestamp}_${planId}`.slice(0, 40);

  const options = {
    amount: Number(amount) * 100, // Convert to paise safely
    currency,
    receipt,
    notes: {
      userId,
      planId,
    },
  };

  const order = await razorpayClient.orders.create(options);

  // Publish event → payment pending
  await publishPaymentEvent({
    type: "payment.pending",
    paymentId: order.id,
    userId,
    planId,
    amount,
    currency,
    orderId: order.id,
    timestamp: new Date().toISOString(),
  });

  logger.info("Payment order created", { orderId: order.id });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    razorpayKeyId: config.razorpay.keyId,
  };
}

/**
 * ================================
 * ACTIVATE SUBSCRIPTION (Synchronous)
 * ================================
 */
async function activateSubscription(
  userId: string,
  planId: string,
  paymentId: string,
  amount: number,
  orderId: string
) {
  try {
    // Check if this is a new subscription (first payment)
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    const isNewSubscription = !existingSubscription || !existingSubscription.isActive;
    const FREE_TRIAL_DAYS = 7; // 7 days free trial for new users

    // Calculate expiry date
    const expiresAt = new Date();
    if (planId === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      // default monthly
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Set trial end date for new subscriptions
    const trialEndsAt = isNewSubscription
      ? new Date(Date.now() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000)
      : null;

    // Create/update transaction
    await prisma.transaction.upsert({
      where: { paymentId },
      create: {
        paymentId,
        userId,
        planId,
        amount: Math.round(amount),
        status: "success",
        meta: { orderId },
      },
      update: {
        planId,
        amount: Math.round(amount),
        status: "success",
        meta: { orderId },
      },
    });

    // Activate subscription
    const subscription = await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId,
        isActive: true,
        autoRenew: true,
        expiresAt,
        trialEndsAt,
      },
      update: {
        planId,
        isActive: true,
        autoRenew: true,
        expiresAt,
        trialEndsAt: trialEndsAt ?? existingSubscription?.trialEndsAt ?? null,
        updatedAt: new Date(),
      },
    });

    // Create invoice
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        userId,
        subscriptionId: subscription.id,
        planId,
        amount: Math.round(amount),
        currency: "INR",
        status: "paid",
        paymentId,
      },
    });

    // Link transaction to invoice
    await prisma.transaction.update({
      where: { paymentId },
      data: { invoiceId: invoice.id, subscriptionId: subscription.id },
    });

    logger.info(`Subscription activated synchronously for ${userId}`, {
      subscriptionId: subscription.id,
      invoiceNumber,
      expiresAt: expiresAt.toISOString(),
      planId,
      isActive: subscription.isActive,
    });
  } catch (error: any) {
    logger.error("Error activating subscription synchronously", {
      error: error.message,
      stack: error.stack,
      userId,
      planId,
      paymentId,
    });
    // Re-throw so caller knows activation failed
    throw error;
  }
}

/**
 * ================================
 * VERIFY PAYMENT SIGNATURE
 * ================================
 */
export async function verifyPaymentSignature(params: VerifySignatureParams) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;

  const isValid = verifySignature(
    `${razorpay_order_id}|${razorpay_payment_id}`,
    razorpay_signature,
    config.razorpay.keySecret
  );

  if (isValid) {
    // Fetch ORDER (not payment) to get correct notes
    const order: any = await razorpayClient.orders.fetch(razorpay_order_id);

    // SAFE extractions
    const userId: string = String(order.notes?.userId ?? "");
    const planId: string = String(order.notes?.planId ?? "");
    const amount: number = Number(order.amount ?? 0) / 100;
    const currency: string = String(order.currency ?? "INR");

    // Activate subscription SYNCHRONOUSLY (immediate activation)
    if (userId && planId) {
      try {
        await activateSubscription(userId, planId, razorpay_payment_id, amount, razorpay_order_id);
        logger.info("Subscription activation completed successfully");
      } catch (activationError: any) {
        logger.error("Failed to activate subscription synchronously, will rely on RabbitMQ", {
          error: activationError.message,
          userId,
          planId,
        });
        // Continue - RabbitMQ will handle it as backup
      }
    } else {
      logger.warn("Missing userId or planId, skipping synchronous subscription activation", {
        userId: userId || "missing",
        planId: planId || "missing",
      });
    }

    // Also publish to RabbitMQ for logging/auditing (async, non-blocking)
    await publishPaymentEvent({
      type: "payment.success",
      paymentId: razorpay_payment_id,
      userId,
      planId,
      amount,
      currency,
      orderId: razorpay_order_id,
      timestamp: new Date().toISOString(),
      raw: order,
    });

    logger.info("Payment verified successfully", {
      paymentId: razorpay_payment_id,
    });
  } else {
    await publishPaymentEvent({
      type: "payment.failed",
      paymentId: razorpay_payment_id,
      userId: "unknown",
      planId: "unknown",
      amount: 0,
      currency: "INR",
      orderId: razorpay_order_id,
      timestamp: new Date().toISOString(),
      raw: { reason: "Signature verification failed" },
    });

    logger.warn("Payment verification failed", {
      orderId: razorpay_order_id,
    });
  }

  return { verified: isValid };
}

/**
 * ================================
 * HANDLE RAZORPAY WEBHOOK EVENTS
 * ================================
 */
export async function handlePaymentWebhook(event: string, payload: any) {
  logger.info("Processing webhook event", { event });

  const paymentEntity =
    payload.payment?.entity || payload.order?.entity;

  if (!paymentEntity) {
    logger.warn("Invalid webhook payload");
    return;
  }

  let eventType: PaymentEvent["type"];

  switch (event) {
    case "payment.captured":
      eventType = "payment.captured";
      break;
    case "payment.failed":
      eventType = "payment.failed";
      break;
    default:
      logger.info("Unhandled webhook event", { event });
      return;
  }

  // Publish event
  await publishPaymentEvent({
    type: eventType,
    paymentId: paymentEntity.id,
    userId: paymentEntity.notes?.userId ?? "unknown",
    planId: paymentEntity.notes?.planId ?? "unknown",
    amount: Number(paymentEntity.amount) / 100, 
    currency: paymentEntity.currency,
    orderId: paymentEntity.order_id,
    timestamp: new Date().toISOString(),
    raw: paymentEntity,
  });

  logger.info("Webhook event processed", {
    event,
    paymentId: paymentEntity.id,
  });
}