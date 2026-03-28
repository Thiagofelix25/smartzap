import { NextResponse } from "next/server";
import { deleteApiKey } from "@/lib/builder/mock-api-keys";
import { NextRequest } from 'next/server'
import { requireSessionOrApiKey } from '@/lib/request-auth'

type RouteParams = {
  params: Promise<{ keyId: string }>;
};

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  const { keyId } = await params;
  deleteApiKey(keyId);
  return NextResponse.json({ success: true });
}
