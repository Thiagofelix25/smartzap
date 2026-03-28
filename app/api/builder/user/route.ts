import { NextResponse } from "next/server";
import { NextRequest } from 'next/server'
import { requireSessionOrApiKey } from '@/lib/request-auth'

export async function GET(request: NextRequest) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  return NextResponse.json({
    id: "user",
    name: "Builder User",
    email: "builder@example.com",
    image: null,
    isAnonymous: true,
    providerId: null,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  return NextResponse.json({ success: true });
}
