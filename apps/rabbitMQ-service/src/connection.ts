// connection.ts
import amqp from "amqplib";
import dotenv from "dotenv";
dotenv.config();

let connection = null;
let channel = null;

export async function initRabbit(url) {
  if (channel) return channel;
  try {
    connection = await amqp.connect(url);
    connection.on("error", (err) => {
      console.error("RabbitMQ connection error:", err.message);
    });
    connection.on("close", () => {
      console.error("RabbitMQ connection closed. Reconnecting...");
      channel = null;
      connection = null;
      setTimeout(() => initRabbit(url), 3000);
    });

    channel = await connection.createChannel();
    console.log("Worker connected to RabbitMQ");
    return channel;
  } catch (err) {
    console.error("Worker RabbitMQ init failed:", err.message);
    setTimeout(() => initRabbit(url), 3000);
  }
}

export function getChannel() {
  if (!channel) throw new Error("Channel not initialized");
  return channel;
}