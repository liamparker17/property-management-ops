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

export function getStaffNavItems(role: string): NavItem[] {
  const items = [...NAV];
  if (role === 'ADMIN') {
    items.push({ href: '/settings/team', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/settings') });
  }
  return items;
}

interface SidebarProps {
  role: string;
  email?: string;
  orgName?: string;
}

export function Sidebar({ role, email, orgName }: SidebarProps) {
  const items = getStaffNavItems(role);
  return <SidebarBody items={items} brand="PMOps" footerLine={orgName ?? email} />;
}

interface SidebarBodyProps {
  items: NavItem[];
  brand: string;
  footerLine?: string;
  onNavigate?: () => void;
}

export function SidebarBody({ items, brand, footerLine, onNavigate }: SidebarBodyProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
          <Home className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight">{brand}</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Property Ops</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-card'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary"
                />
              ) : null}
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  active ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground',
                )}
              />
              <span className={active ? 'font-semibold' : ''}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      {footerLine ? (
        <div className="border-t border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {(footerLine?.[0] ?? 'P').toUpperCase()}
            </div>
            <div className="min-w-0 text-xs">
              <div className="truncate font-medium text-sidebar-foreground">{footerLine}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Signed in</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DesktopSidebar({ role, email, orgName }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border lg:block">
      <Sidebar role={role} email={email} orgName={orgName} />
    </aside>
  );
}
