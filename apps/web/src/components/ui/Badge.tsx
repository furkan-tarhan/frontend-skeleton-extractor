import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'danger'
  | 'rarity-consumer'
  | 'rarity-industrial'
  | 'rarity-milspec'
  | 'rarity-restricted'
  | 'rarity-classified'
  | 'rarity-covert'
  | 'rarity-gold';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-surface-raised text-muted border border-subtle',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
  'rarity-consumer': 'bg-rarity-consumer/10 text-rarity-consumer',
  'rarity-industrial': 'bg-rarity-industrial/10 text-rarity-industrial',
  'rarity-milspec': 'bg-rarity-milspec/10 text-rarity-milspec',
  'rarity-restricted': 'bg-rarity-restricted/10 text-rarity-restricted',
  'rarity-classified': 'bg-rarity-classified/10 text-rarity-classified',
  'rarity-covert': 'bg-rarity-covert/10 text-rarity-covert',
  'rarity-gold': 'bg-rarity-gold/10 text-rarity-gold',
};

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
