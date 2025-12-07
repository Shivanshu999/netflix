import { razorpayClient } from "../config/razorpay.config.js";
import { verifySignature } from "../utils/crypto.utils.js";
import { config } from "../config/env.config.js";
import { publishPaymentEvent } from "./rabbitmq.service.js";
import { logger } from "../utils/logger.utils.js";
import type { PaymentEvent } from "../types/payment.types.js";

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