import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { NextRequest } from 'next/server'
import { requireSessionOrApiKey } from '@/lib/request-auth'

export async function GET(request: NextRequest) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  return NextResponse.json([]);
}

export async function POST(request: Request) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    id: nanoid(),
    name: body?.name ?? "Integration",
    type: body?.type ?? "custom",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
