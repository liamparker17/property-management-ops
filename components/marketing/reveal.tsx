'use client';

import { useEffect } from 'react';

/**
 * Mount once. Observes any element with `data-reveal` and sets
 * `data-state="in"` when it enters the viewport. Pair with the
 * `[data-reveal]` CSS rule in globals.css.
 *
 * Optional `data-reveal-delay="120"` (ms) staggers the transition.
 *
 * Server-rendered elements start hidden (opacity 0, slight Y-offset);
 * the observer reveals them on intersection. Reduced-motion users get
 * an instant fade via the global @media block.
 */
export function RevealObserver() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        el.dataset.state = 'in';
      });
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = Number(el.dataset.revealDelay ?? 0);
            if (delay > 0) el.style.transitionDelay = `${delay}ms`;
            el.dataset.state = 'in';
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    const observe = () => {
      document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-state="in"])').forEach((el) => {
        io.observe(el);
      });
    };

    observe();

    // Pick up sections injected on route change inside the marketing transition wrapper
    const mo = new MutationObserver(observe);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
