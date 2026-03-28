import { NextResponse } from "next/server";
import { NextRequest } from 'next/server'
import { requireSessionOrApiKey } from '@/lib/request-auth'

type RouteParams = {
  params: Promise<{ integrationId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  const { integrationId } = await params;
  return NextResponse.json({
    id: integrationId,
    name: "Integration",
    type: "custom",
    config: {},
  });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  const { integrationId } = await params;
  return NextResponse.json({
    id: integrationId,
    name: "Integration",
    type: "custom",
    config: {},
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  return NextResponse.json({ success: true });
}
