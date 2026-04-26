'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { cn } from '@/lib/utils';

type MapTableToggleProps = {
  current: 'map' | 'table';
};

function useRouterSafe(): ReturnType<typeof useRouter> | null {
  try { return useRouter(); } catch { return null; }
}
function usePathnameSafe(): string {
  try { return usePathname() ?? '/'; } catch { return '/'; }
}
function useSearchParamsSafe(): URLSearchParams {
  try { return new URLSearchParams(useSearchParams()?.toString() ?? ''); } catch { return new URLSearchParams(); }
}

export function MapTableToggle({ current }: MapTableToggleProps) {
  const router = useRouterSafe();
  const pathname = usePathnameSafe();
  const params = useSearchParamsSafe();
  const [, startTransition] = useTransition();

  function setView(view: 'map' | 'table') {
    if (!router) return;
    const next = new URLSearchParams(params.toString());
    if (view === 'map') next.delete('view');
    else next.set('view', view);
    startTransition(() => router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ''}`));
  }

  return (
    <div className="inline-flex border border-border">
      {(['map', 'table'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          className={cn(
            'px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em]',
            current === v ? 'bg-[color:var(--muted)] text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {v === 'map' ? 'Map' : 'Table'}
        </button>
      ))}
    </div>
  );
}
