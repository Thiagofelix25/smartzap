import { NextResponse } from "next/server";
import { settingsDb } from "@/lib/supabase-db";
import { NextRequest } from 'next/server'
import { requireSessionOrApiKey } from '@/lib/request-auth'

const SETTINGS_KEY = "workflow_builder_default_id";

export async function GET(request: NextRequest) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  const value = await settingsDb.get(SETTINGS_KEY);
  return NextResponse.json({ defaultWorkflowId: value || "" });
}

export async function POST(request: Request) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  const body = await request.json().catch(() => ({}));
  const defaultWorkflowId = String(body?.defaultWorkflowId || "").trim();
  await settingsDb.set(SETTINGS_KEY, defaultWorkflowId);
  return NextResponse.json({ defaultWorkflowId });
}
