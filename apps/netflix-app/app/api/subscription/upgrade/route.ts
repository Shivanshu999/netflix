import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";

const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:3002";

export async function POST(request: NextRequest) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const newPlanId = body.planId as "monthly" | "yearly";

  if (!newPlanId || (newPlanId !== "monthly" && newPlanId !== "yearly")) {
    return NextResponse.json(
      { message: "Invalid plan selected" },
      { status: 400 }
    );
  }

  // Get current subscription
  const currentSubscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  if (!currentSubscription || !currentSubscription.isActive) {
    return NextResponse.json(
      { message: "No active subscription found" },
      { status: 400 }
    );
  }

  // If already on the same plan, return error
  if (currentSubscription.planId === newPlanId) {
    return NextResponse.json(
      { message: "You are already on this plan" },
      { status: 400 }
    );
  }

  // Fetch plans from payment service to calculate upgrade price
  let priceInfo: { amount: number; discount: number; originalAmount: number } | null = null;
  
  try {
    const plansResponse = await fetch(`${PAYMENT_SERVICE_URL}/api/v1/plans`);
    if (plansResponse.ok) {
      const plansData = await plansResponse.json();
      const plans = plansData.data || [];
      
      const monthlyPlan = plans.find((p: any) => p.id === "monthly");
      const yearlyPlan = plans.find((p: any) => p.id === "yearly");
      
      if (currentSubscription.planId === "monthly" && newPlanId === "yearly" && monthlyPlan && yearlyPlan) {
        // Calculate upgrade discount
        const now = new Date();
        const timeRemaining = currentSubscription.expiresAt.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)));
        const monthsRemaining = daysRemaining / 30;
        
        const remainingValue = Math.round(monthlyPlan.amount * monthsRemaining);
        const discountedAmount = Math.max(0, yearlyPlan.amount - remainingValue);
        
        priceInfo = {
          amount: discountedAmount,
          discount: remainingValue,
          originalAmount: yearlyPlan.amount,
        };
      } else if (newPlanId === "monthly" || newPlanId === "yearly") {
        // No upgrade discount, use plan's default amount
        const targetPlan = plans.find((p: any) => p.id === newPlanId);
        if (targetPlan) {
          priceInfo = {
            amount: targetPlan.amount,
            discount: 0,
            originalAmount: targetPlan.amount,
          };
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch plans for upgrade calculation:", error);
  }

  if (!priceInfo) {
    return NextResponse.json(
      { message: "Failed to calculate upgrade price" },
      { status: 500 }
    );
  }

  // Send planId and calculated amount to payment service
  // Payment service will validate planId and can use provided amount for upgrades
  const payload = {
    userId: user.id,
    planId: newPlanId,
    amount: priceInfo.amount, // Calculated upgrade amount
    currency: "INR",
  };

  const response = await fetch(
    `${PAYMENT_SERVICE_URL}/api/v1/payment/create-order`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { message: data?.message || "Failed to create upgrade order" },
      { status: response.status }
    );
  }

  return NextResponse.json({
    ...data,
    upgradeInfo: {
      discount: priceInfo.discount,
      originalAmount: priceInfo.originalAmount,
      discountedAmount: priceInfo.amount,
    },
  });
}





