'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Settings,
  Home,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; match: (p: string) => boolean };

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/dashboard' },
  { href: '/properties', label: 'Properties', icon: Building2, match: (p) => p.startsWith('/properties') },
  { href: '/tenants', label: 'Tenants', icon: Users, match: (p) => p.startsWith('/tenants') },
  { href: '/leases', label: 'Leases', icon: FileText, match: (p) => p.startsWith('/leases') },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench, match: (p) => p.startsWith('/maintenance') },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const items = [...NAV];
  if (role === 'ADMIN') {
    items.push({ href: '/settings/team', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/settings') });
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Home className="h-4 w-4" />
        </div>
        <span className="font-semibold tracking-tight">PMOps</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {items.map((item) => {
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
