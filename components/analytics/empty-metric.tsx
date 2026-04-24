'use client';

import { cn } from '@/lib/utils';

type EmptyMetricProps = {
  title: string;
  description: string;
  className?: string;
};

export function EmptyMetric({ title, description, className }: EmptyMetricProps) {
  return (
    <div
      className={cn(
        'border border-dashed border-border bg-[color:var(--muted)]/35 px-5 py-8 text-center',
        className,
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--accent)]">
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
