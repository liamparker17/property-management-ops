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

const TONE_CLASS: Record<NonNullable<StatusItem['tone']>, string> = {
  neutral: 'bg-[color:var(--muted)] text-foreground',
  accent: 'bg-[color:var(--accent)]/15 text-foreground',
  alert: 'bg-amber-100 text-amber-950',
};

export function StatusStrip({ items, className }: StatusStripProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 border border-border bg-card p-3',
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'min-w-28 flex-1 border border-border/70 px-3 py-2',
            TONE_CLASS[item.tone ?? 'neutral'],
          )}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-2 font-serif text-2xl leading-none text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
