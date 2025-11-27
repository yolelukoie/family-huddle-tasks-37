import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface ThemedSectionProps {
  children: ReactNode;
  className?: string;
  intensity?: 'subtle' | 'medium' | 'strong';
}

export function ThemedSection({ children, className, intensity = 'subtle' }: ThemedSectionProps) {
  const intensityClasses = {
    subtle: 'bg-gradient-to-b from-[hsl(var(--section-tint))] to-background',
    medium: 'bg-gradient-to-br from-[hsl(var(--gradient-start))]/20 to-[hsl(var(--gradient-end))]/20',
    strong: 'bg-gradient-to-br from-[hsl(var(--gradient-start))]/30 to-[hsl(var(--gradient-end))]/30',
  };

  return (
    <div className={cn(intensityClasses[intensity], className)}>
      {children}
    </div>
  );
}
