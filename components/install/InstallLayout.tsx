'use client';

import { ReactNode } from 'react';
import { StepDots } from './StepDots';
import { cn } from '@/lib/utils';

interface InstallLayoutProps {
  children: ReactNode;
  currentStep?: number;
  totalSteps?: number;
  showLogo?: boolean;
  showDots?: boolean;
  className?: string;
}

/**
 * Layout principal do wizard de instalação.
 * Tema: Blade Runner - cyberpunk noir com chuva digital.
 */
export function InstallLayout({
  children,
  currentStep = 1,
  totalSteps = 5,
  showLogo = true,
  showDots = true,
  className,
}: InstallLayoutProps) {
  return (
    <div
      className={cn(
        'dark blade-runner',
        'min-h-screen flex flex-col items-center justify-center p-4',
        'bg-[var(--br-void-black)]',
        'relative overflow-hidden',
        className
      )}
    >
      {/* Scanlines overlay */}
      <div className="br-scanlines" />

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top cyan glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[var(--br-neon-cyan)] opacity-[0.03] rounded-full blur-[100px]" />
        {/* Bottom magenta glow */}
        <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-[var(--br-neon-magenta)] opacity-[0.02] rounded-full blur-[80px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        {showLogo && (
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-wider text-[var(--br-hologram-white)]">
              <span className="br-text-glow-cyan">SMART</span>
              <span className="text-[var(--br-neon-magenta)]">ZAP</span>
            </h1>
            <p className="text-xs tracking-[0.3em] text-[var(--br-muted-cyan)] mt-2 uppercase">
              Protocolo de Inicialização
            </p>
          </div>
        )}

        {/* Step Dots */}
        {showDots && (
          <div className="mb-8">
            <StepDots current={currentStep} total={totalSteps} />
          </div>
        )}

        {/* Main Content */}
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
