'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard',             label: 'Overview',    match: (p: string) => p === '/dashboard' },
  { href: '/dashboard/finance',     label: 'Money',       match: (p: string) => p.startsWith('/dashboard/finance') },
  { href: '/dashboard/portfolio',   label: 'Properties',  match: (p: string) => p.startsWith('/dashboard/portfolio') },
  { href: '/dashboard/operations',  label: 'Operations',  match: (p: string) => p.startsWith('/dashboard/operations') },
  { href: '/dashboard/maintenance', label: 'Maintenance', match: (p: string) => p.startsWith('/dashboard/maintenance') },
  { href: '/dashboard/tenants',     label: 'Tenants',     match: (p: string) => p.startsWith('/dashboard/tenants') },
  { href: '/dashboard/utilities',   label: 'Utilities',   match: (p: string) => p.startsWith('/dashboard/utilities') },
  { href: '/dashboard/trust',       label: 'Trust',       match: (p: string) => p.startsWith('/dashboard/trust') },
] as const;

const RANGES = ['1m', '3m', '12m', 'ytd'] as const;
const COMPARES = ['prior', 'yoy', 'off'] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const currentRange = (params.get('range') ?? '12m') as (typeof RANGES)[number];
  const currentCompare = (params.get('compare') ?? 'prior') as (typeof COMPARES)[number];

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/85 px-4 backdrop-blur md:-mx-6 md:px-6">
        <nav aria-label="Dashboard tabs" className="flex gap-1 overflow-x-auto py-2">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            const href = `${tab.href}${params.toString() ? `?${params.toString()}` : ''}`;
            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  'whitespace-nowrap border border-transparent px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em]',
                  active
                    ? 'border-[color:var(--accent)]/60 bg-[color:var(--muted)] text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-3 pb-3 pt-1 text-[11px]">
          <span className="font-mono uppercase tracking-[0.16em] text-muted-foreground">Range</span>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setParam('range', r)}
                className={cn(
                  'border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]',
                  currentRange === r ? 'bg-[color:var(--muted)] text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <span className="ml-3 font-mono uppercase tracking-[0.16em] text-muted-foreground">Compare</span>
          <div className="flex gap-1">
            {COMPARES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setParam('compare', c)}
                className={cn(
                  'border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]',
                  currentCompare === c ? 'bg-[color:var(--muted)] text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}
