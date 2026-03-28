import { NextResponse, NextRequest } from 'next/server'

import { clearCalendarIntegration, getStoredTokens, revokeGoogleToken } from '@/lib/google-calendar'
import { isSupabaseConfigured } from '@/lib/supabase'
import { requireSessionOrApiKey } from '@/lib/request-auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionOrApiKey(request as NextRequest)
    if (auth) return auth

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: false, error: 'Supabase nao configurado' }, { status: 400 })
    }

    const tokens = await getStoredTokens()
    if (tokens?.accessToken) {
      await revokeGoogleToken(tokens.accessToken)
    }
    if (tokens?.refreshToken) {
      await revokeGoogleToken(tokens.refreshToken)
    }

    await clearCalendarIntegration()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[google-calendar] disconnect error:', error)
    return NextResponse.json({ ok: false, error: 'Falha ao desconectar' }, { status: 500 })
  }
}
