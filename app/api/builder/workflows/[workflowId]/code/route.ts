import { NextResponse } from "next/server";
import { NextRequest } from 'next/server'
import { requireSessionOrApiKey } from '@/lib/request-auth'

type RouteParams = {
  params: Promise<{ workflowId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  const { workflowId } = await params;
  return NextResponse.json({
    code: `export async function workflow${workflowId}() {\n  "use workflow";\n}\n`,
    workflowName: "Workflow",
  });
}
