import { NextResponse, NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import {
  ensureWorkflowRecord,
  getCompanyId,
  toSavedWorkflow,
} from "@/lib/builder/workflow-db"
import { requireSessionOrApiKey } from '@/lib/request-auth'

type RouteParams = {
  params: Promise<{ workflowId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  const { workflowId } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 400 }
    );
  }
  const companyId = await getCompanyId(supabase);
  const record = await ensureWorkflowRecord(supabase, workflowId, companyId);
  const workflow = toSavedWorkflow(record);
  return NextResponse.json({
    name: workflow.name,
    workflow,
  });
}
