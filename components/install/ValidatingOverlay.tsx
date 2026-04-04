'use client';

import { cn } from '@/lib/utils';

interface ValidatingOverlayProps {
  isVisible: boolean;
  message: string;
  subMessage?: string;
  className?: string;
}

/**
 * Overlay que aparece durante validação de tokens.
 * Tema Blade Runner - "Voight-Kampff em progresso"
 */
export function ValidatingOverlay({
  isVisible,
  message,
  subMessage,
  className,
}: ValidatingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-20',
        'flex flex-col items-center justify-center',
        'bg-[var(--br-void-black)]/95 backdrop-blur-sm',
        'rounded-2xl',
        className
      )}
    >
      {/* Spinner cyberpunk - círculos concêntricos */}
      <div className="relative w-16 h-16 mb-4">
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-[var(--br-neon-cyan)]/30 border-t-[var(--br-neon-cyan)] animate-spin"
          style={{ animationDuration: '3s' }}
        />
        {/* Middle ring */}
        <div
          className="absolute inset-2 rounded-full border-2 border-[var(--br-neon-magenta)]/30 border-b-[var(--br-neon-magenta)] animate-spin"
          style={{ animationDuration: '2s', animationDirection: 'reverse' }}
        />
        {/* Inner ring */}
        <div
          className="absolute inset-4 rounded-full border-2 border-[var(--br-neon-cyan)]/30 border-t-[var(--br-neon-cyan)] animate-spin"
          style={{ animationDuration: '1.5s' }}
        />
        {/* Center dot */}
        <div
          className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-[var(--br-neon-cyan)] animate-pulse"
        />
      </div>

      {/* Main message */}
      <p className="text-[var(--br-hologram-white)] font-mono font-medium text-center uppercase tracking-wide">
        {message}
      </p>

      {/* Sub message */}
      {subMessage && (
        <p className="text-sm text-[var(--br-muted-cyan)] font-mono mt-1 text-center">
          {subMessage}
        </p>
      )}

      {/* Scanning line effect */}
      <div className="w-32 h-1 mt-5 rounded-full overflow-hidden bg-[var(--br-dust-gray)]/30">
        <div
          className="w-1/3 h-full bg-gradient-to-r from-transparent via-[var(--br-neon-cyan)] to-transparent animate-[scan_1.5s_ease-in-out_infinite]"
        />
      </div>
    </div>
  );
}
