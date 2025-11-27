// subscription.ts
import {prisma} from "../../../packages/db/db";


export async function upsertSubscription(userId, planId, expiresAt) {
  if (!userId) throw new Error("userId required");
  return prisma.subscription.upsert({
    where: { userId },
    update: {
      planId,
      isActive: true,
      expiresAt
    },
    create: {
      userId,
      planId,
      isActive: true,
      expiresAt
    }
  });
}