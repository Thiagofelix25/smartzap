import { NextResponse, NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { randomBytes } from 'crypto'
import type {
  AttendantToken,
  CreateAttendantTokenDTO,
  UpdateAttendantTokenDTO,
} from '@/types'
import { requireSessionOrApiKey } from '@/lib/request-auth'
import { CreateAttendantTokenSchema, validateBody, formatZodErrors } from '@/lib/api-validation'

// =============================================================================
// GET - Listar todos os tokens de atendentes
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionOrApiKey(request as NextRequest)
    if (auth) return auth

    const { data, error } = await supabase
      .from('attendant_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] Erro ao buscar tokens:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar tokens de atendentes' },
        { status: 500 }
      );
    }

    return NextResponse.json(data as AttendantToken[]);
  } catch (error) {
    console.error('[API] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Criar novo token de atendente
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionOrApiKey(request)
    if (auth) return auth

    const body = await request.json();

    // Validação com Zod
    const validation = validateBody(CreateAttendantTokenSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validação falhou', details: formatZodErrors(validation.error) },
        { status: 400 }
      )
    }

    const validated = validation.data

    // Gerar token único (16 bytes = 32 caracteres hex)
    const token = randomBytes(16).toString('hex');

    const { data, error } = await supabase
      .from('attendant_tokens')
      .insert({
        name: validated.name,
        token,
        conversation_mode: validated.conversation_mode,
        system_prompt: validated.system_prompt || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[API] Erro ao criar token:', error);
      return NextResponse.json(
        { error: 'Erro ao criar token de atendente' },
        { status: 500 }
      );
    }

    return NextResponse.json(data as AttendantToken, { status: 201 });
  } catch (error) {
    console.error('[API] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
