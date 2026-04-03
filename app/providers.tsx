'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { CentralizedRealtimeProvider } from '@/components/providers/CentralizedRealtimeProvider'
import { DevModeProvider } from '@/components/providers/DevModeProvider'
import { PWAProvider } from '@/components/pwa'
import { BootstrapInit } from '@/components/bootstrap-init'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Defaults otimizados para SaaS
            staleTime: 30 * 1000, // 30s - dados considerados frescos
            gcTime: 5 * 60 * 1000, // 5 min - manter cache por mais tempo
            refetchOnWindowFocus: false, // Evita refetch desnecessário
            refetchOnReconnect: true, // Recarrega ao reconectar
            retry: 1, // Uma única retry em falha
            retryDelay: 1000, // 1s entre retries
          },
        },
      })
  )

  return (
    <BootstrapInit>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <QueryClientProvider client={queryClient}>
          <DevModeProvider>
            <CentralizedRealtimeProvider>
              <PWAProvider>
                {children}
              </PWAProvider>
            </CentralizedRealtimeProvider>
          </DevModeProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BootstrapInit>
  )
}

