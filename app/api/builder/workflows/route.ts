import { NextResponse, NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import {
  getCompanyId,
  listWorkflowRecords,
  toSavedWorkflow,
} from "@/lib/builder/workflow-db"
import { requireSessionOrApiKey } from '@/lib/request-auth'

export async function GET(request: NextRequest) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json([]);
  }

  const companyId = await getCompanyId(supabase);
  const records = await listWorkflowRecords(supabase, companyId);
  return NextResponse.json(records.map((record) => toSavedWorkflow(record)));
}
