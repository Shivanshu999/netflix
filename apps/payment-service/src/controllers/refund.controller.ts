import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.utils.js";
import { razorpayClient } from "../config/razorpay.config.js";
import { PrismaClient } from "@prisma/client";

const REFUND_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const prisma = new PrismaClient();

export async function refundLastPayment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req.body as { userId?: string };

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    // Find most recent successful transaction for this user
    const tx = await prisma.transaction.findFirst({
      where: {
        userId,
        status: "success",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!tx) {
      return res.status(404).json({
        success: false,
        message: "No refundable transaction found",
      });
    }

    const now = Date.now();
    const created = new Date(tx.createdAt).getTime();

    const withinWindow = now - created <= REFUND_WINDOW_MS;

    if (!withinWindow) {
      // Only cancel in app side (no refund) – caller will handle subscription
      return res.status(200).json({
        success: false,
        refundable: false,
        message: "Refund window expired; only cancelling membership.",
      });
    }

    // Call Razorpay refund API
    // Docs: https://razorpay.com/docs/api/refunds/#create-a-refund
    const refund = await razorpayClient.payments.refund(tx.paymentId, {
      amount: tx.amount * 100, // paise
      speed: "optimum",
      notes: {
        userId: tx.userId,
        planId: tx.planId,
      },
    });

    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: "refunded",
        meta: {
          ...(tx.meta as any),
          refund,
        },
      },
    });

    logger.info("Refund processed", {
      paymentId: tx.paymentId,
      refundId: refund.id,
      userId: tx.userId,
    });

    return res.status(200).json({
      success: true,
      refundable: true,
      message: "Refund processed successfully",
      data: {
        refundId: refund.id,
      },
    });
  } catch (error) {
    logger.error("Error processing refund:", error);
    next(error);
  }
}


