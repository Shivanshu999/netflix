// consumer.ts
import { getChannel } from "./connection.js";

export async function consumeQueue(queueName, handler) {
  const channel = getChannel();
  await channel.assertQueue(queueName, { durable: true });
  console.log("Worker consuming from queue:", queueName);

  channel.consume(
    queueName,
    async (msg) => {
      if (!msg) return;
      const text = msg.content.toString();
      console.log("Worker received:", text);

      try {
        const payload = JSON.parse(text);
        await handler(payload);
        channel.ack(msg);
      } catch (err) {
        console.error("Handler error:", err);
        // requeue for retry — be careful to avoid infinite loops for poison messages
        channel.nack(msg, false, true);
      }
    },
    { noAck: false }
  );
}