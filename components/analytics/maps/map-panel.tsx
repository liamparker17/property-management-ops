'use client';

import dynamic from 'next/dynamic';

import { EmptyMetric } from '@/components/analytics/empty-metric';
import type { PortfolioPin } from '@/components/analytics/maps/portfolio-pins';
import { cn } from '@/lib/utils';

const PortfolioPins = dynamic(
  () => import('@/components/analytics/maps/portfolio-pins').then((mod) => mod.PortfolioPins),
  { ssr: false },
);

type MapPanelProps = {
  title: string;
  eyebrow?: string;
  pins: PortfolioPin[];
  className?: string;
};

export function MapPanel({
  title,
  eyebrow = 'Map',
  pins,
  className,
}: MapPanelProps) {
  return (
    <section className={cn('overflow-hidden border border-border bg-card', className)}>
      <header className="border-b border-border/70 px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--accent)]">
          {eyebrow}
        </p>
        <h3 className="mt-2 font-serif text-2xl leading-none text-foreground">{title}</h3>
      </header>
      <div className="h-[360px] bg-[color:var(--muted)]/25">
        {pins.length === 0 ? (
          <div className="p-5">
            <EmptyMetric
              title="No Pins"
              description="Add geocoded properties to unlock portfolio mapping."
              className="h-full"
            />
          </div>
        ) : (
          <PortfolioPins pins={pins} />
        )}
      </div>
    </section>
  );
}
