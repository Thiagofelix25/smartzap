'use client'

import { useEffect } from 'react'

/**
 * BootstrapInit — verifica se o schema do banco está pronto via /api/health.
 * Roda uma única vez no mount. Se o health check falhar (DB não configurado),
 * loga no console — não bloqueia a UI.
 */
export function BootstrapInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.services?.database?.status === 'ok') {
          console.log('[Bootstrap] Database ready')
        } else {
          console.warn('[Bootstrap] Database not ready:', data.services?.database?.message)
        }
      })
      .catch(() => {
        // Silencia erros de rede durante instalação (Supabase ainda não configurado)
      })
  }, [])

  return <>{children}</>
}
