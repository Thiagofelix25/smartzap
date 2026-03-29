import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { NextRequest } from 'next/server'
import { requireSessionOrApiKey } from '@/lib/request-auth'
import { CreateBuilderIntegrationSchema, validateBody, formatZodErrors } from '@/lib/api-validation'

export async function GET(request: NextRequest) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  return NextResponse.json([]);
}

export async function POST(request: Request) {
  const auth = await requireSessionOrApiKey(request as NextRequest)
  if (auth) return auth

  const body = await request.json().catch(() => ({}));
  const validation = validateBody(CreateBuilderIntegrationSchema, body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validação falhou', details: formatZodErrors(validation.error) },
      { status: 400 }
    )
  }

  const validated = validation.data
  return NextResponse.json({
    id: nanoid(),
    name: validated.name,
    type: validated.type,
    config: validated.config,
    credentials: validated.credentials,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
