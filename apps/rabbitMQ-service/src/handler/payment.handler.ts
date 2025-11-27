// payment.handler.ts
import { upsertSubscription } from "../subscription";
import { prisma } from "../../../../packages/db/db";

export async function processPaymentEvent(event) {
  console.log("Processing payment event:", event.type);

  // save transaction record
  try {
    await prisma.transaction.create({
      data: {
        paymentId: event.paymentId,
        userId: event.userId || "unknown",
        planId: event.planId || "unknown",
        amount: event.amount || 0,
        status: event.type,
        meta: event.raw ?? {},
      },
    });
  } catch (err) {
    // ignore duplicate transaction error or log
    console.error("Transaction save error (maybe duplicate):", err.message);
  }

  // activate subscription for payment.success
  if (event.type === "payment.success" || event.type === "payment.captured") {
    const days = 30; // default 30-day plan — adapt as needed
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await upsertSubscription(event.userId, event.planId, expiresAt);
    console.log("Subscription upserted for user:", event.userId);
  }

  // you can add more handlers (email, analytics) here
}
