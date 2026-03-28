import { NextResponse } from "next/server";
import { NextRequest } from 'next/server'
import { requireSessionOrApiKey } from '@/lib/request-auth'

export async function POST(request: NextRequest) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  return NextResponse.json({
    success: false,
    hasManagedKey: false,
    error: "AI Gateway not configured",
  });
}
