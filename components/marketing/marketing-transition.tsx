'use client';

import { usePathname } from 'next/navigation';

export function MarketingTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-route-in">
      {children}
    </div>
  );
}
