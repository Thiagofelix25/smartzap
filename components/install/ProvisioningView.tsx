'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Dna } from 'lucide-react';
import { StepCard } from './StepCard';
import { cn } from '@/lib/utils';
import type { InstallData, ProvisionStreamEvent, ProvisionPayload } from '@/lib/installer/types';

interface ProvisioningViewProps {
  data: InstallData;
  progress: number;
  title: string;
  subtitle: string;
  onProgress: (event: ProvisionStreamEvent) => void;
  onReset?: () => void;
}

/**
 * View de provisionamento com streaming SSE.
 * Tema Blade Runner - "Câmara de Incubação"
 */
export function ProvisioningView({ data, progress, title, subtitle, onProgress, onReset }: ProvisioningViewProps) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasStartedRef = useRef(false);
  const ignoreFirstCleanupRef = useRef(true);
  const safeProgress = Math.min(100, Math.max(0, progress));

  const startProvisioning = useCallback(async () => {
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    abortControllerRef.current = new AbortController();

    const payload: ProvisionPayload = {
      identity: {
        name: data.name,
        email: data.email,
        password: data.password,
      },
      vercel: {
        token: data.vercelToken,
      },
      supabase: {
        pat: data.supabasePat,
      },
      qstash: {
        token: data.qstashToken,
      },
      redis: {
        restUrl: data.redisRestUrl,
        restToken: data.redisRestToken,
      },
    };

    try {
      const response = await fetch('/api/installer/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream não disponível');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: ProvisionStreamEvent = JSON.parse(line.slice(6));
              onProgress(event);
            } catch (parseErr) {
              console.warn('[Provisioning] Erro ao parsear evento SSE:', {
                line: line.slice(0, 100),
                error: parseErr instanceof Error ? parseErr.message : 'Erro desconhecido',
              });
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return;
      }

      onProgress({
        type: 'error',
        error: err instanceof Error ? err.message : 'Erro desconhecido',
        returnToStep: 1,
      });
    }
  }, [data, onProgress]);

  useEffect(() => {
    startProvisioning();
    // Intentionally run only on mount - startProvisioning is stable
    return () => {
      if (ignoreFirstCleanupRef.current) {
        ignoreFirstCleanupRef.current = false;
        return;
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <StepCard glowColor="cyan">
      <div className="flex flex-col items-center text-center py-8">
        {/* Animated DNA icon - Incubation chamber */}
        <div className="relative animate-bounce" style={{ animationDuration: '3s' }}>
          {/* Outer rotating ring */}
          <div
            className="absolute inset-0 w-20 h-20 rounded-full border-2 border-[var(--br-neon-cyan)]/20 border-t-[var(--br-neon-cyan)] animate-spin"
            style={{ animationDuration: '4s' }}
          />
          {/* Inner rotating ring (opposite direction) */}
          <div
            className="absolute inset-2 w-16 h-16 rounded-full border-2 border-[var(--br-neon-magenta)]/20 border-b-[var(--br-neon-magenta)] animate-spin"
            style={{ animationDuration: '3s', animationDirection: 'reverse' }}
          />
          {/* Center icon */}
          <div className="w-20 h-20 flex items-center justify-center">
            <div className="animate-spin" style={{ animationDuration: '6s' }}>
              <Dna className="w-8 h-8 text-[var(--br-neon-cyan)]" />
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 w-20 h-20 rounded-full bg-[var(--br-neon-cyan)]/10 blur-xl" />
        </div>

        {/* Title */}
        <h2 className="mt-6 text-xl font-mono font-bold text-[var(--br-hologram-white)] uppercase tracking-wide">
          {title}
        </h2>

        {/* Subtitle */}
        <p className="mt-2 text-sm font-mono text-[var(--br-muted-cyan)] h-5">
          {subtitle}
        </p>

        {/* Progress bar - Blade Runner style */}
        <div className="w-full mt-8">
          <div className="h-2 bg-[var(--br-dust-gray)]/30 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500 ease-out',
                'bg-gradient-to-r from-[var(--br-neon-cyan)] via-[var(--br-neon-magenta)] to-[var(--br-neon-cyan)]',
                'bg-[length:200%_100%] animate-[gradient-shift_2s_linear_infinite]'
              )}
              style={{ width: `${safeProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs font-mono text-[var(--br-dust-gray)]">
            <span>INCUBAÇÃO</span>
            <span className="text-[var(--br-neon-cyan)]">{safeProgress}%</span>
          </div>
        </div>

        {/* Warning text */}
        <p className="mt-6 text-xs font-mono text-[var(--br-neon-orange)] animate-pulse">
          ! NÃO INTERROMPA O PROCESSO DE INCUBAÇÃO
        </p>
      </div>
    </StepCard>
  );
}
