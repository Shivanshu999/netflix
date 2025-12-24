import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";

const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:3002";

export async function POST(request: NextRequest) {
  if (process.env.PAYMENT_SERVICE_URL === undefined) {
    console.warn(
      "PAYMENT_SERVICE_URL env missing; falling back to http://localhost:3002"
    );
  }

  const body = await request.json();

  const response = await fetch(
    `${PAYMENT_SERVICE_URL}/api/v1/payment/verify`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();

  // If payment was verified successfully, verify subscription was activated
  if (response.ok && data.success) {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    
    if (user && data.data?.paymentId) {
      // Wait a moment for database transaction to commit
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Check for transaction first to get planId
      const transaction = await prisma.transaction.findUnique({
        where: { paymentId: data.data.paymentId },
      });

      // Verify subscription exists and is active
      let subscription = await prisma.subscription.findUnique({
        where: { userId: user.id },
      });

      const now = new Date();
      let isActive = 
        subscription?.isActive &&
        subscription?.expiresAt &&
        subscription.expiresAt > now;

      // If subscription doesn't exist or isn't active, but we have a successful transaction, activate it
      if (!isActive && transaction && transaction.status === "success") {
        console.log("Subscription not active but payment successful, activating subscription as fallback");
        
        const expiresAt = new Date();
        if (transaction.planId === "yearly") {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        subscription = await prisma.subscription.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            planId: transaction.planId,
            isActive: true,
            autoRenew: true,
            expiresAt,
          },
          update: {
            planId: transaction.planId,
            isActive: true,
            autoRenew: true,
            expiresAt,
            updatedAt: new Date(),
          },
        });

        isActive = true;
        console.log("Subscription activated as fallback:", {
          subscriptionId: subscription.id,
          expiresAt: expiresAt.toISOString(),
        });
      }

      console.log("Verification complete - Subscription status:", {
        userId: user.id,
        subscriptionExists: !!subscription,
        isActive,
        expiresAt: subscription?.expiresAt?.toISOString(),
        planId: subscription?.planId,
      });

      return NextResponse.json({
        ...data,
        subscriptionActive: isActive,
      }, { status: response.status });
    }
  }

  return NextResponse.json(data, { status: response.status });
}

