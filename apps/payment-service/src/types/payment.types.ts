// src/types/payment.types.ts
import { z } from "zod";

/**
 * ===========================
 *  ZOD SCHEMAS
 * ===========================
 */

const planIds = ["monthly", "yearly"] as const;

export const createOrderSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  planId: z.enum(planIds, {
    // either a simple string:
    // error: "Invalid plan ID",

    // or a Zod error map function returning { message: string }:
    error: () => ({ message: "Invalid plan ID" }),
  }),
  amount: z.number().positive("Amount must be positive").optional(),
  currency: z.string().optional().default("INR"),
});
export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, "Order ID is required"),
  razorpay_payment_id: z.string().min(1, "Payment ID is required"),
  razorpay_signature: z.string().min(1, "Signature is required"),
});

/**
 * ===========================
 *  INFERRED TYPES
 * ===========================
 */

export type CreateOrderRequest = z.infer<typeof createOrderSchema>;
export type VerifyPaymentRequest = z.infer<typeof verifyPaymentSchema>;

/**
 * ==========================================
 *  PAYMENT EVENT TYPE (FINAL + STRICT)
 * ==========================================
 *
 * This type is used in:
 * - Razorpay webhook
 * - publishPaymentEvent()
 * - RabbitMQ message body
 * - payment.service.ts
 *
 * Everything MUST match this shape.
 */

export type PaymentEvent = {
  type:
    | "payment.pending"
    | "payment.success"
    | "payment.failed"
    | "payment.captured"
    | "payment.subscription_created"
    | "payment.subscription_renewed"
    | "payment.subscription_cancelled"
    | "payment.retry_scheduled"
    | "payment.completed";

  paymentId?: string | undefined;
  userId?: string | undefined;
  planId?: string | undefined;
  amount?: number | undefined;
  currency?: string | undefined;
  orderId?: string | undefined;
  subscriptionId?: string | undefined;
  invoiceId?: number | undefined;
  discount?: number | undefined;
  upgrade?: boolean | undefined;

  timestamp?: string | undefined;
  raw?: any;
};