import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface LogPaymentEventParams {
  userId?: string;
  paymentId?: string;
  orderId?: string;
  eventType: string;
  status: "success" | "failed" | "pending";
  gatewayResponse?: any;
  errorMessage?: string;
  metadata?: any;
}

/**
 * Log payment events for auditing and debugging
 */
export async function logPaymentEvent(params: LogPaymentEventParams) {
  try {
    await prisma.paymentLog.create({
      data: {
        userId: params.userId || null,
        paymentId: params.paymentId || null,
        orderId: params.orderId || null,
        eventType: params.eventType,
        status: params.status,
        gatewayResponse: params.gatewayResponse || null,
        errorMessage: params.errorMessage || null,
        metadata: params.metadata || null,
      },
    });
  } catch (error) {
    // Don't throw - logging should never break payment flow
    console.error("Failed to log payment event:", error);
  }
}

/**
 * Get payment logs for a user
 */
export async function getUserPaymentLogs(userId: string, limit = 50) {
  return prisma.paymentLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get payment logs for a payment ID
 */
export async function getPaymentLogs(paymentId: string) {
  return prisma.paymentLog.findMany({
    where: { paymentId },
    orderBy: { createdAt: "asc" },
  });
}





