import { NextResponse, NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import {
  createWorkflowRecord,
  ensureWorkflowRecord,
  getCompanyId,
  toSavedWorkflow,
} from "@/lib/builder/workflow-db"
import { requireSessionOrApiKey } from '@/lib/request-auth'

type RouteParams = {
  params: Promise<{ workflowId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
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
  const duplicate = await createWorkflowRecord(
    supabase,
    {
      name: `${record.workflow.name} Copy`,
      description: record.workflow.description ?? undefined,
      nodes: record.version.nodes,
      edges: record.version.edges,
    },
    companyId
  );
  return NextResponse.json(toSavedWorkflow(duplicate));
}
