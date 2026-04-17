'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Folder, User, Wrench, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/tenant', label: 'Home', icon: Home, match: (p: string) => p === '/tenant' },
  { href: '/tenant/lease', label: 'My Lease', icon: FileText, match: (p: string) => p.startsWith('/tenant/lease') },
  { href: '/tenant/invoices', label: 'Invoices', icon: Receipt, match: (p: string) => p.startsWith('/tenant/invoices') },
  { href: '/tenant/repairs', label: 'Repairs', icon: Wrench, match: (p: string) => p.startsWith('/tenant/repairs') },
  { href: '/tenant/documents', label: 'Documents', icon: Folder, match: (p: string) => p.startsWith('/tenant/documents') },
  { href: '/tenant/profile', label: 'Profile', icon: User, match: (p: string) => p.startsWith('/tenant/profile') },
];

export function TenantSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Home className="h-4 w-4" />
        </div>
        <span className="font-semibold tracking-tight">Tenant Portal</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-sidebar-primary' : '')} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
