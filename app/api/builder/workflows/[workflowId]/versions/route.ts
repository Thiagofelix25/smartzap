import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest } from 'next/server'
import { requireSessionOrApiKey } from '@/lib/request-auth'

type RouteParams = {
  params: Promise<{ workflowId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  const { workflowId } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json([]);
  }

  const { data } = await supabase
    .from("workflow_versions")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("version", { ascending: false });

  return NextResponse.json(data || []);
}
