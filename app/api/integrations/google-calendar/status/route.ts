import { NextResponse, NextRequest } from 'next/server'

import { getCalendarChannel, getCalendarConfig, getStoredTokens } from '@/lib/google-calendar'
import { isSupabaseConfigured } from '@/lib/supabase'
import { requireSessionOrApiKey } from '@/lib/request-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionOrApiKey(request as NextRequest)
    if (auth) return auth

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ connected: false, error: 'Supabase não configurado' }, { status: 400 })
    }

    const [tokens, config, channel] = await Promise.all([
      getStoredTokens(),
      getCalendarConfig(),
      getCalendarChannel(),
    ])

    const connected = !!tokens?.accessToken

    return NextResponse.json({
      connected,
      calendar: config,
      channel,
      hasRefreshToken: Boolean(tokens?.refreshToken),
      expiresAt: tokens?.expiryDate || null,
    })
  } catch (error) {
    console.error('[google-calendar] status error:', error)
    return NextResponse.json({ connected: false, error: 'Falha ao consultar status' }, { status: 500 })
  }
}
