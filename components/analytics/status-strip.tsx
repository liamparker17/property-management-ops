'use client';

import { cn } from '@/lib/utils';

type StatusItem = {
  id: string;
  label: string;
  value: string;
  tone?: 'neutral' | 'accent' | 'alert';
};

type StatusStripProps = {
  items: StatusItem[];
  className?: string;
};

type Tone = NonNullable<StatusItem['tone']>;

const TONE_SURFACE: Record<Tone, string> = {
  neutral: 'border-border/70 bg-[color:var(--muted)]',
  accent: 'border-[color:var(--accent)]/30 bg-[color:var(--accent)]/12',
  alert:
    'border-amber-400/50 bg-amber-100 dark:border-amber-400/35 dark:bg-amber-950/35',
};

const TONE_LABEL: Record<Tone, string> = {
  neutral: 'text-muted-foreground',
  accent: 'text-[color:var(--accent)]/85',
  alert: 'text-amber-800/90 dark:text-amber-200/85',
};

const TONE_VALUE: Record<Tone, string> = {
  neutral: 'text-foreground',
  accent: 'text-foreground',
  alert: 'text-amber-950 dark:text-amber-50',
};

export function StatusStrip({ items, className }: StatusStripProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 border border-border bg-card p-3',
        className,
      )}
    >
      {items.map((item) => {
        const tone: Tone = item.tone ?? 'neutral';
        return (
          <div
            key={item.id}
            className={cn('min-w-28 flex-1 border px-3 py-2', TONE_SURFACE[tone])}
          >
            <p
              className={cn(
                'font-mono text-[10px] uppercase tracking-[0.22em]',
                TONE_LABEL[tone],
              )}
            >
              {item.label}
            </p>
            <p
              className={cn(
                'mt-2 font-serif text-2xl leading-none',
                TONE_VALUE[tone],
              )}
            >
              {item.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
