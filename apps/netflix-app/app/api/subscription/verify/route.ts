import { NextRequest, NextResponse } from "next/server";

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

  return NextResponse.json(data, { status: response.status });
}

