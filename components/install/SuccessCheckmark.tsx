'use client';

import { Check } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SuccessCheckmarkProps {
  onComplete?: () => void;
  delay?: number;
  message?: string;
  className?: string;
}

/**
 * Animação de checkmark após validação bem-sucedida.
 * Tema Blade Runner - "Autenticidade confirmada"
 */
export function SuccessCheckmark({
  onComplete,
  delay = 2500,
  message = 'Validado com sucesso!',
  className,
}: SuccessCheckmarkProps) {
  useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, delay);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [onComplete, delay]);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-8',
        className
      )}
    >
      {/* Circle with checkmark */}
      <div className="relative">
        {/* Circle background */}
        <div
          className={cn(
            'w-20 h-20 rounded-full',
            'bg-[var(--br-neon-cyan)]/20',
            'border-2 border-[var(--br-neon-cyan)]',
            'flex items-center justify-center',
            'shadow-[0_0_30px_var(--br-neon-cyan)/0.4]'
          )}
        >
          {/* Checkmark icon */}
          <div>
            <Check
              className="w-10 h-10 text-[var(--br-neon-cyan)]"
              strokeWidth={3}
            />
          </div>
        </div>
      </div>

      {/* Success message */}
      <p className="mt-4 text-lg font-mono font-medium text-[var(--br-hologram-white)]">
        {message}
      </p>

      {/* Progress bar with glow */}
      <div className="mt-4 h-1 bg-[var(--br-dust-gray)]/30 rounded-full overflow-hidden w-32">
        <div
          className="h-full bg-gradient-to-r from-[var(--br-neon-cyan)] to-[var(--br-neon-magenta)] animate-[progress-fill_linear]"
          style={{
            animation: `progress-fill ${delay / 1000}s linear forwards`,
          }}
        />
      </div>
    </div>
  );
}
