import { NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";

const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:4000";

export async function POST() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated" },
      { status: 401 }
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  if (!subscription) {
    return NextResponse.json(
      { success: false, message: "No active subscription found" },
      { status: 400 }
    );
  }

  // Check if subscription is already cancelled
  if (subscription.autoRenew === false) {
    return NextResponse.json(
      { 
        success: false, 
        message: "Your membership has already been cancelled. You can continue using the service until your subscription expires.",
        alreadyCancelled: true
      },
      { status: 400 }
    );
  }

  // Calculate subscription usage time (time since subscription was created)
  const now = new Date();
  const subscriptionStartTime = subscription.createdAt;
  const usageTimeInMinutes = (now.getTime() - subscriptionStartTime.getTime()) / (1000 * 60);
  const hasUsedMoreThan5Minutes = usageTimeInMinutes > 5;

  // Try to request refund from payment service (it will decide if within window)
  let refunded = false;
  try {
    const response = await fetch(
      `${PAYMENT_SERVICE_URL}/api/v1/payment/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      refunded = Boolean(data?.refundable && data?.success);
    }
  } catch (error) {
    console.error("Refund request failed; proceeding with cancel only", error);
  }

  // Cancel Razorpay subscription if exists
  if (subscription.razorpaySubscriptionId) {
    try {
      await fetch(
        `${PAYMENT_SERVICE_URL}/api/v1/payment/cancel-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscriptionId: subscription.razorpaySubscriptionId,
          }),
        }
      );
    } catch (error) {
      console.error("Failed to cancel Razorpay subscription", error);
    }
  }

  // If refunded, end subscription immediately
  // Otherwise, cancel auto-renew but keep access until expiry
  // If user has used more than 5 minutes, they keep access but won't be charged again
  await prisma.subscription.update({
    where: { userId: user.id },
    data: {
      autoRenew: false, // Cancel auto-renew
      // Only end subscription immediately if refunded
      isActive: refunded ? false : subscription.isActive,
      expiresAt: refunded ? new Date() : subscription.expiresAt,
    },
  });

  let message: string;
  if (refunded) {
    message = "Subscription cancelled and refunded. Access ended immediately.";
  } else if (hasUsedMoreThan5Minutes) {
    message = "Your membership has been cancelled. You can continue enjoying the service until your subscription expires, but you will not be charged again.";
  } else {
    message = "Auto-renew cancelled. You can continue using the service until your subscription expires.";
  }

  return NextResponse.json({
    success: true,
    refunded,
    hasUsedMoreThan5Minutes,
    message,
  });
}


