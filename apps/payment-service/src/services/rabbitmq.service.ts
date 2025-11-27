import amqplib from "amqplib";
import { config } from "../config/env.config.js";
import { logger } from "../utils/logger.utils.js";
import type { PaymentEvent } from "../types/payment.types.js";

// 1. MAGIC FIX: Infer the type directly from the library function
// This bypasses the naming conflict entirely.

type AmqpConnection = Awaited<ReturnType<typeof amqplib.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection["createChannel"]>>;

let connection: AmqpConnection | null = null;
let channel: AmqpChannel | null = null;

export async function initRabbitMQ(): Promise<void> {
  try {
    const conn = await amqplib.connect(config.rabbitmq.url);
    connection = conn;
    
    const ch = await conn.createChannel();
    channel = ch;
    
    await ch.assertQueue(config.rabbitmq.paymentQueue, { durable: true });
    
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
    throw new Error("RabbitMQ channel not initialized");
  }
  
  const message = JSON.stringify(event);
  channel.sendToQueue(
    config.rabbitmq.paymentQueue,
    Buffer.from(message),
    { persistent: true }
  );
  
  logger.info("Payment event published", {
    type: event.type,
    paymentId: event.paymentId,
  });
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) await channel.close();
    
    // If this still errors, we cast to 'any' as a last resort safety valve
    if (connection) await (connection as any).close(); 
    
    logger.info("RabbitMQ connection closed");
  } catch (err) {
    logger.error("Error closing RabbitMQ:", err);
  }
}