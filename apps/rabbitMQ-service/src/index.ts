// src/index.ts - Simple version
import amqp from "amqplib";
import dotenv from "dotenv";
import { prisma } from "../../../packages/db/db.js";

dotenv.config();
console.log("CURRENT DATABASE_URL =", process.env.DATABASE_URL);
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const PAYMENT_QUEUE = process.env.PAYMENT_QUEUE || "payment_events";

console.log("RABBITMQ_URL:", RABBITMQ_URL);
console.log("PAYMENT_QUEUE:", PAYMENT_QUEUE);

async function start() {
  try {
    console.log("🔌 Connecting to RabbitMQ...");
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(PAYMENT_QUEUE, { durable: true });
    console.log(`📥 Waiting for messages in queue: ${PAYMENT_QUEUE}`);

    channel.consume(
      PAYMENT_QUEUE,
      async (msg) => {
        if (msg !== null) {
          try {
            const content = msg.content.toString();
            console.log("📨 Received message:", content);
            
            const payload = JSON.parse(content);

            // Process payment event
            if (payload.type === "payment.success") {
              console.log("Processing payment success...");

              const planId = payload.planId || "monthly";
              const userId = payload.userId;

              if (!userId) {
                console.error("❌ Missing userId in payment event, skipping");
                channel.ack(msg);
                return;
              }

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

              const amount = Number(payload.amount ?? 0);

              await prisma.transaction.upsert({
                where: { paymentId: payload.paymentId },
                create: {
                  paymentId: payload.paymentId,
                  userId,
                  planId,
                  amount: Math.round(amount),
                  status: "success",
                  meta: payload.raw ?? {},
                },
                update: {
                  planId,
                  amount: Math.round(amount),
                  status: "success",
                  meta: payload.raw ?? {},
                },
              });

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
                  autoRenew: true, // Re-enable auto-renew on payment
                  expiresAt,
                  trialEndsAt: trialEndsAt || existingSubscription?.trialEndsAt, // Keep existing trial or set new
                  updatedAt: new Date(),
                },
              });

              // Create invoice for this payment
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
                  paymentId: payload.paymentId,
                },
              });

              // Link transaction to invoice
              await prisma.transaction.update({
                where: { paymentId: payload.paymentId },
                data: { invoiceId: invoice.id, subscriptionId: subscription.id },
              });

              console.log(`✅ Subscription activated for ${userId}, Invoice: ${invoiceNumber}`);
            }

            channel.ack(msg);
          } catch (error) {
            console.error("❌ Error processing message:", error);
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false }
    );

    console.log("✅ Consumer is running...");
  } catch (err: any) {
    console.error("❌ RabbitMQ connection error:", err.message);
    setTimeout(start, 5000);
  }
}

start();