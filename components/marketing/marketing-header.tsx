'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const INK = '#001030';
const GOLD = '#b8965a';

const NAV = [
  { href: '/product', label: 'Product' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all"
      style={{
        background: scrolled ? 'rgba(253,252,250,0.88)' : 'rgba(253,252,250,0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: scrolled ? `0 1px 0 ${INK}14` : 'none',
      }}
    >
      <div className="flex items-center justify-between px-6 py-4 md:px-14">
        <Link href="/" className="flex items-center gap-2.5 no-underline" onClick={() => setOpen(false)}>
          <span className="inline-flex overflow-hidden rounded-sm">
            <img src="/regalis.svg" alt="Regalis" className="h-9 w-9 object-contain" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-serif text-[20px] font-normal uppercase tracking-[0.08em]" style={{ color: INK }}>
              Regalis
            </span>
            <span
              className="mt-[2px] font-mono text-[9px] uppercase tracking-[0.2em]"
              style={{
                color: GOLD,
                WebkitTextStroke: `0.35px ${INK}`,
                textShadow: `0 0 1px ${INK}`,
              }}
            >
              Property Ops
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[12px] font-medium uppercase tracking-[0.12em] no-underline transition hover:opacity-70"
              style={{ color: INK }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="text-[12px] font-medium uppercase tracking-[0.12em] no-underline transition hover:opacity-70"
            style={{ color: INK }}
          >
            Sign in
          </Link>
          <Link
            href="/contact"
            className="inline-block px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] no-underline transition hover:brightness-110"
            style={{ background: INK, color: '#fdfcfa' }}
          >
            Talk to us
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X size={22} color={INK} /> : <Menu size={22} color={INK} />}
        </button>
      </div>

      {open && (
        <div
          className="border-t px-6 pb-8 pt-4 md:hidden"
          style={{ background: '#fdfcfa', borderColor: `${INK}14` }}
        >
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="py-3 text-[14px] font-medium uppercase tracking-[0.12em] no-underline"
                style={{ color: INK }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="py-3 text-[14px] font-medium uppercase tracking-[0.12em] no-underline"
              style={{ color: INK }}
            >
              Sign in
            </Link>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="mt-4 inline-block px-5 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.14em] no-underline"
              style={{ background: INK, color: '#fdfcfa' }}
            >
              Talk to us
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
