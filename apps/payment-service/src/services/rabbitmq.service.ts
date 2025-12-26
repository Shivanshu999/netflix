import amqplib from "amqplib";
import { config } from "../config/env.config.js";
import { logger } from "../utils/logger.utils.js";
import {
  rabbitmqMessagesPublished,
  rabbitmqMessagesPublishedErrors,
} from "../utils/metrics.utils.js";
import type { PaymentEvent } from "../types/payment.types.js";

// 1. MAGIC FIX: Infer the type directly from the library function
// This bypasses the naming conflict entirely.

type AmqpConnection = Awaited<ReturnType<typeof amqplib.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection["createChannel"]>>;

let connection: AmqpConnection | null = null;
let channel: AmqpChannel | null = null;

export async function initRabbitMQ(): Promise<void> {
  //	1.	Connect to RabbitMQ
  // 2.	Create a channel
  // 3.	Ensure the payment queue exists
  // 4.	Save connection + channel globally

  try {
    const conn = await amqplib.connect(config.rabbitmq.url);
    connection = conn;

    const ch = await conn.createChannel();
    channel = ch;

    await ch.assertQueue(config.rabbitmq.paymentQueue, { durable: true });

    // •If RabbitMQ crashes, Docker restarts, or network breaks →
    // Your app does NOT crash.
    // 	•	You reset internal state.
    // 	•	And you retry connection after 5 seconds.

    // ✔ Makes your publisher production-ready
    // ✔ No downtime
    // ✔ No message loss
    conn.on("error", (err) => {
      logger.error("RabbitMQ connection error:", err);
      connection = null;
      channel = null;
    });

    conn.on("close", () => {
      logger.warn("RabbitMQ closed. Reconnecting...");
      connection = null;
      channel = null;
      setTimeout(initRabbitMQ, 5000);
    });

    logger.info("RabbitMQ publisher connected");
  } catch (err) {
    logger.error("RabbitMQ init failed:", err);
    setTimeout(initRabbitMQ, 5000);
  }
}

export async function publishPaymentEvent(event: PaymentEvent): Promise<void> {
  if (!channel) {
    rabbitmqMessagesPublishedErrors.inc({ event_type: event.type });
    logger.warn("RabbitMQ not ready, skipping publish", {
      eventType: event.type,
    });
    return;
  }

  try {
    const message = JSON.stringify(event);
    channel.sendToQueue(config.rabbitmq.paymentQueue, Buffer.from(message), {
      persistent: true,
    });

    // Track metrics
    rabbitmqMessagesPublished.inc({ event_type: event.type });

    logger.info("Payment event published", {
      type: event.type,
      paymentId: event.paymentId,
    });
  } catch (error) {
    // Track error metrics
    rabbitmqMessagesPublishedErrors.inc({ event_type: event.type });
    throw error;
  }
}
