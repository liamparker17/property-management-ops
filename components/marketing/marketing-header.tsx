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

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300"
      style={{
        background: scrolled ? 'rgba(253, 252, 250, 0.85)' : '#fdfcfa',
        backdropFilter: scrolled ? 'saturate(180%) blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'saturate(180%) blur(12px)' : 'none',
        boxShadow: scrolled ? `0 1px 0 ${INK}14, 0 8px 24px -16px ${INK}29` : 'none',
      }}
    >
      <div
        className="flex items-center justify-between px-6 transition-[padding] duration-300 md:px-14"
        style={{ paddingTop: scrolled ? 12 : 16, paddingBottom: scrolled ? 12 : 16 }}
      >
        <Link
          href="/"
          className="press group flex items-center gap-2.5 no-underline"
          onClick={() => setOpen(false)}
        >
          <span className="inline-flex overflow-hidden rounded-sm transition-transform duration-500 group-hover:scale-[1.04]">
            <img src="/regalis.svg" alt="Regalis" className="h-9 w-9 object-contain" />
          </span>
          <span className="flex flex-col leading-none">
            <span
              className="font-serif text-[20px] font-normal uppercase tracking-[0.08em]"
              style={{ color: INK }}
            >
              Regalis
            </span>
            <span
              className="mt-[2px] font-mono text-[9px] uppercase tracking-[0.2em] transition-colors duration-300 group-hover:opacity-80"
              style={{ color: GOLD }}
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
              className="link-underline text-[12px] font-medium uppercase tracking-[0.12em] no-underline"
              style={{ color: INK }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="link-underline text-[12px] font-medium uppercase tracking-[0.12em] no-underline"
            style={{ color: INK }}
          >
            Sign in
          </Link>
          <Link
            href="/contact"
            className="cta-solid press inline-block px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] no-underline"
            style={{ background: INK, color: '#fdfcfa' }}
          >
            Talk to us
          </Link>
        </nav>

        <button
          type="button"
          className="press inline-flex h-10 w-10 items-center justify-center rounded-sm md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <span className="relative inline-flex h-5 w-5 items-center justify-center">
            <Menu
              size={22}
              color={INK}
              className="absolute transition-all duration-300"
              style={{
                opacity: open ? 0 : 1,
                transform: open ? 'rotate(-90deg) scale(0.6)' : 'rotate(0) scale(1)',
              }}
            />
            <X
              size={22}
              color={INK}
              className="absolute transition-all duration-300"
              style={{
                opacity: open ? 1 : 0,
                transform: open ? 'rotate(0) scale(1)' : 'rotate(90deg) scale(0.6)',
              }}
            />
          </span>
        </button>
      </div>

      {open && (
        <div
          className="animate-drawer-in border-t px-6 pb-8 pt-4 md:hidden"
          style={{ background: '#fdfcfa', borderColor: `${INK}14` }}
        >
          <nav className="flex flex-col gap-1">
            {NAV.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="animate-drawer-item press py-3 text-[14px] font-medium uppercase tracking-[0.12em] no-underline"
                style={{ color: INK, animationDelay: `${60 + i * 40}ms` }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="animate-drawer-item press py-3 text-[14px] font-medium uppercase tracking-[0.12em] no-underline"
              style={{ color: INK, animationDelay: `${60 + NAV.length * 40}ms` }}
            >
              Sign in
            </Link>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="animate-drawer-item cta-solid press mt-4 inline-block px-5 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.14em] no-underline"
              style={{
                background: INK,
                color: '#fdfcfa',
                animationDelay: `${60 + (NAV.length + 1) * 40}ms`,
              }}
            >
              Talk to us
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
