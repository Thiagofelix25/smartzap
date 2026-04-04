'use client';

import { cn } from '@/lib/utils';

interface StepDotsProps {
  current: number;
  total: number;
  completedSteps?: number[];
  className?: string;
}

/**
 * Indicador de progresso estilo Blade Runner.
 * Dots com glow neon cyan.
 */
export function StepDots({
  current,
  total,
  completedSteps = [],
  className,
}: StepDotsProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {Array.from({ length: total }).map((_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isCompleted = completedSteps.includes(stepNum) || stepNum < current;

        return (
          <div
            key={i}
            className="relative"
          >
            {/* Dot */}
            <div
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all duration-300 relative z-10',
                isActive && 'bg-[var(--br-neon-cyan)] shadow-[0_0_8px_var(--br-neon-cyan)] scale-130',
                isCompleted && !isActive && 'bg-[var(--br-neon-cyan)]/50',
                !isActive && !isCompleted && 'bg-[var(--br-dust-gray)]'
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
