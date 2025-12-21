import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import type { NextRequest, NextResponse } from "next/server";

// Validate required Kinde environment variables
function validateKindeConfig() {
  const requiredEnvVars = [
    'KINDE_SITE_URL',
    'KINDE_POST_LOGIN_REDIRECT_URL',
    'KINDE_POST_LOGOUT_REDIRECT_URL',
    'KINDE_CLIENT_ID',
    'KINDE_CLIENT_SECRET',
  ];

  const missingVars: string[] = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar] || process.env[envVar]?.trim() === '') {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    console.error('❌ Missing required Kinde environment variables:', missingVars.join(', '));
    console.error('Please set the following environment variables:');
    missingVars.forEach(v => console.error(`  - ${v}`));
    return { valid: false, message: `Missing: ${missingVars.join(', ')}` };
  }

  // Validate that URLs are valid
  const urlEnvVars = [
    'KINDE_SITE_URL',
    'KINDE_POST_LOGIN_REDIRECT_URL',
    'KINDE_POST_LOGOUT_REDIRECT_URL',
  ];

  for (const envVar of urlEnvVars) {
    const value = process.env[envVar];
    if (value) {
      try {
        new URL(value);
      } catch (error) {
        console.error(`❌ Invalid URL for ${envVar}: "${value}"`);
        return { valid: false, message: `Invalid URL in ${envVar}: ${value}` };
      }
    }
  }

  return { valid: true };
}

export default function middleware(req: NextRequest) {
  // Validate environment variables before calling withAuth
  const validation = validateKindeConfig();
  if (!validation.valid) {
    // Return error response to prevent Invalid URL error
    console.error('❌ Kinde configuration error:', validation.message);
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Invalid URL', 
        message: 'Kinde authentication configuration error. Please check your environment variables are set and contain valid URLs.',
        details: validation.message,
        requiredVariables: [
          'KINDE_SITE_URL (e.g., http://localhost:3000)',
          'KINDE_POST_LOGIN_REDIRECT_URL (e.g., http://localhost:3000/home)',
          'KINDE_POST_LOGOUT_REDIRECT_URL (e.g., http://localhost:3000)',
          'KINDE_CLIENT_ID',
          'KINDE_CLIENT_SECRET',
        ]
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    return withAuth(req);
  } catch (error: any) {
    // Catch and provide a more helpful error message as a fallback
    if (error?.message?.includes('Invalid URL') || error?.message?.includes('URL')) {
      console.error('❌ URL Error in Kinde middleware:', error.message);
      console.error('Please ensure the following environment variables are set correctly:');
      console.error('  - KINDE_SITE_URL (e.g., http://localhost:3000 or https://yourdomain.com)');
      console.error('  - KINDE_POST_LOGIN_REDIRECT_URL (e.g., http://localhost:3000/home)');
      console.error('  - KINDE_POST_LOGOUT_REDIRECT_URL (e.g., http://localhost:3000)');
      
      return new NextResponse(
        JSON.stringify({ 
          error: 'Invalid URL', 
          message: 'Kinde authentication configuration error. Please check your environment variables are set and contain valid URLs.',
          errorDetails: error.message
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    // Re-throw other errors
    throw error;
  }
}

export const config = {
  matcher: [
    // Run on everything but Next internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ]
};
