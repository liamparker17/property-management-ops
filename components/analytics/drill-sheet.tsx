'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

type DrillSheetProps = {
  title: string;
  csvHref?: string;
  children: React.ReactNode;
};

export function DrillSheet({ title, csvHref, children }: DrillSheetProps) {
  // useRouter throws outside the App Router context (e.g. SSR test renders).
  // We try to use it; if the call fails we fall back to history.replaceState
  // so SSR snapshots still work. In the browser the router path is taken so
  // closing actually triggers a Server Component re-render of the layout.
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    router = useRouter();
  } catch {
    router = null;
  }
  const ref = useRef<HTMLDivElement>(null);

  function closeDrill() {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('drill');
    const search = url.searchParams.toString();
    const next = url.pathname + (search ? `?${search}` : '');
    if (router) router.replace(next);
    else window.history.replaceState(null, '', next);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDrill();
    }
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close"
        onClick={closeDrill}
        className="absolute inset-0 cursor-default bg-background/60 backdrop-blur-sm"
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col border-l border-border bg-card shadow-xl outline-none',
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <h2 className="font-serif text-[22px] font-light text-foreground">{title}</h2>
          <div className="flex items-center gap-2">
            {csvHref ? (
              <Link
                href={csvHref}
                className="border border-border bg-[color:var(--muted)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground"
              >
                Export CSV
              </Link>
            ) : null}
            <button
              type="button"
              onClick={closeDrill}
              className="border border-border bg-[color:var(--muted)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
