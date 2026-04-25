'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils';

type RankedListItem = {
  id: string;
  title: string;
  subtitle?: string;
  value: string;
  href?: string;
};

type RankedListProps = {
  title: string;
  eyebrow?: string;
  items: RankedListItem[];
  emptyCopy?: string;
  className?: string;
};

function RankedListRow({ item, index }: { item: RankedListItem; index: number }) {
  const content = (
    <div className="flex items-center gap-4 border-t border-border/70 px-5 py-4 first:border-t-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-[color:var(--muted)] text-sm font-medium text-foreground">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        {item.subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
        ) : null}
      </div>
      <p className="font-serif text-2xl leading-none text-foreground">{item.value}</p>
    </div>
  );

  if (!item.href) return content;

  return (
    <Link href={item.href} className="block transition hover:bg-[color:var(--muted)]/35">
      {content}
    </Link>
  );
}

export function RankedList({
  title,
  eyebrow = 'Ranked',
  items,
  emptyCopy = 'No rows to show.',
  className,
}: RankedListProps) {
  return (
    <section className={cn('border border-border bg-card', className)}>
      <header className="relative border-b border-border/70 px-5 py-4">
        <span
          aria-hidden
          className="absolute left-0 top-4 bottom-4 w-0.5 bg-[color:var(--accent)]/70"
        />
        <p className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
          <span aria-hidden className="block h-px w-6 bg-[color:var(--accent)]/80" />
          {eyebrow}
        </p>
        <h3 className="mt-2 font-serif text-2xl leading-none text-foreground">{title}</h3>
      </header>

      {items.length === 0 ? (
        <div className="px-5 py-8 text-sm text-muted-foreground">{emptyCopy}</div>
      ) : (
        <div>
          {items.map((item, index) => (
            <RankedListRow key={item.id} item={item} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
