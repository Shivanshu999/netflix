import { NextResponse } from "next/server";

const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:3002";

export async function GET() {
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `${PAYMENT_SERVICE_URL}/api/v1/plans`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`Payment service error (${response.status}):`, errorText);
      return NextResponse.json(
        { 
          success: false,
          message: `Payment service returned error: ${response.status}`,
          error: errorText 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Only log errors during runtime, not during build time
    // During Vercel builds, API routes may be analyzed but external services aren't available
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                       process.env.NEXT_PHASE === 'phase-export' ||
                       (error.code === 'ECONNREFUSED' && error.address === '127.0.0.1' && process.env.VERCEL === '1');
    
    if (!isBuildTime) {
      console.error("Error fetching plans from payment service:", error);
    }
    
    // Check if it's a connection error or timeout
    if (error.name === 'AbortError' || error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      return NextResponse.json(
        { 
          success: false,
          message: "Cannot connect to payment service. Please ensure the payment service is running on port 3002.",
          error: error.name === 'AbortError' ? "Request timeout" : (error.message || "Connection failed")
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        message: "Failed to fetch plans from payment service",
        error: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}



