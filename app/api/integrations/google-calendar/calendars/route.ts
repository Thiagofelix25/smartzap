import { NextResponse, NextRequest } from 'next/server'

import { listCalendars } from '@/lib/google-calendar'
import { isSupabaseConfigured } from '@/lib/supabase'
import { requireSessionOrApiKey } from '@/lib/request-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionOrApiKey(request as NextRequest)
    if (auth) return auth

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase nao configurado' }, { status: 400 })
    }

    const calendars = await listCalendars()
    const payload = calendars.map((item: any) => ({
      id: String(item.id),
      summary: String(item.summary || ''),
      primary: Boolean(item.primary),
      timeZone: item.timeZone ? String(item.timeZone) : null,
    }))

    return NextResponse.json({ calendars: payload })
  } catch (error) {
    console.error('[google-calendar] calendars error:', error)
    return NextResponse.json({ error: 'Falha ao listar calendarios' }, { status: 500 })
  }
}
