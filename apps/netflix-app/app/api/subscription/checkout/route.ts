import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:3002";

export async function POST(request: NextRequest) {
  if (process.env.PAYMENT_SERVICE_URL === undefined) {
    console.warn(
      "PAYMENT_SERVICE_URL env missing; falling back to http://localhost:3002"
    );
  }

  const body = await request.json();
  const planId = body.planId;

  if (!planId || (planId !== "monthly" && planId !== "yearly")) {
    return NextResponse.json(
      { message: "Invalid plan selected" },
      { status: 400 }
    );
  }

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 }
    );
  }

  // Backend validates planId and calculates amount - we only send planId
  const payload = {
    userId: user.id,
    planId: planId,
    // Amount is calculated by payment service from backend plan data
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
      { message: data?.message || "Failed to create order" },
      { status: response.status }
    );
  }

  return NextResponse.json(data);
}

