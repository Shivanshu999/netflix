import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.utils.js";

const prisma = new PrismaClient();

interface CreateInvoiceParams {
  userId: string;
  subscriptionId: number;
  planId: string;
  amount: number;
  currency?: string;
  paymentId?: string;
  status?: string;
}

/**
 * Generate unique invoice number
 */
function generateInvoiceNumber(): string {
  const prefix = "INV";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Create invoice for a subscription payment
 */
export async function createInvoice(params: CreateInvoiceParams) {
  const {
    userId,
    subscriptionId,
    planId,
    amount,
    currency = "INR",
    paymentId,
    status = "pending",
  } = params;

  const invoiceNumber = generateInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      userId,
      subscriptionId,
      planId,
      amount,
      currency,
      status,
      paymentId: paymentId || null,
    },
  });

  logger.info("Invoice created", {
    invoiceId: invoice.id,
    invoiceNumber,
    userId,
    subscriptionId,
  });

  return invoice;
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  invoiceId: number,
  status: string,
  paymentId?: string
) {
  const updateData: {
    status: string;
    paymentId?: string | null;
    updatedAt: Date;
  } = {
    status,
    updatedAt: new Date(),
  };

  if (paymentId !== undefined) {
    updateData.paymentId = paymentId || null;
  }

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: updateData,
  });

  logger.info("Invoice status updated", {
    invoiceId,
    status,
    paymentId,
  });

  return invoice;
}

/**
 * Mark invoice as emailed
 */
export async function markInvoiceAsEmailed(invoiceId: number) {
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      emailedAt: new Date(),
    },
  });

  logger.info("Invoice marked as emailed", { invoiceId });
}

/**
 * Get invoices for a user
 */
export async function getUserInvoices(userId: string) {
  return prisma.invoice.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      transactions: true,
    },
  });
}

