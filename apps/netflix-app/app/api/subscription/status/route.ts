import { NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  
  if (!user) {
    return NextResponse.json(
      { active: false, reason: "unauthenticated" },
      { status: 401 }
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  const now = new Date();
  
  // Check if subscription is active (either paid or in trial period)
  const isInTrial = subscription?.trialEndsAt && subscription.trialEndsAt > now;
  const isPaidActive = 
    Boolean(subscription?.isActive) &&
    subscription?.expiresAt &&
    subscription.expiresAt > now;
  
  const active = isInTrial || isPaidActive;

  // Enhanced debug logging
  console.log(`Subscription status check for user ${user.id}:`, {
    subscriptionExists: !!subscription,
    isActive: subscription?.isActive,
    expiresAt: subscription?.expiresAt?.toISOString(),
    expiresAtRaw: subscription?.expiresAt,
    now: now.toISOString(),
    nowRaw: now,
    trialEndsAt: subscription?.trialEndsAt?.toISOString(),
    isInTrial,
    isPaidActive,
    finalActive: active,
    planId: subscription?.planId,
  });

  return NextResponse.json({
    active,
    subscription: subscription
      ? {
          planId: subscription.planId,
          expiresAt: subscription.expiresAt,
          trialEndsAt: subscription.trialEndsAt,
          isInTrial: isInTrial,
          autoRenew: subscription.autoRenew,
        }
      : null,
  });
}





