import { NextResponse, NextRequest } from "next/server"
import { createApiKey, listApiKeys } from "@/lib/builder/mock-api-keys"
import { requireSessionOrApiKey } from '@/lib/request-auth'

export async function GET(request: NextRequest) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  return NextResponse.json(listApiKeys());
}

export async function POST(request: Request) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name : "API Key";
  const entry = createApiKey(name);
  return NextResponse.json(entry);
}
