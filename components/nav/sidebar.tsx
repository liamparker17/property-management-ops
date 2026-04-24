'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  LayoutDashboard,
  Building2,
  Users,
  ClipboardCheck,
  ClipboardList,
  DoorClosed,
  FileText,
  FileSpreadsheet,
  Gauge,
  Plug,
  Receipt,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; match: (p: string) => boolean };

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/dashboard' },
  { href: '/dashboard/portfolio', label: 'Portfolio', icon: Building2, match: (p) => p.startsWith('/dashboard/portfolio') },
  { href: '/dashboard/operations', label: 'Operations', icon: ClipboardCheck, match: (p) => p.startsWith('/dashboard/operations') },
  { href: '/dashboard/finance', label: 'Finance', icon: Wallet, match: (p) => p.startsWith('/dashboard/finance') },
  { href: '/dashboard/maintenance', label: 'Maint View', icon: Wrench, match: (p) => p.startsWith('/dashboard/maintenance') },
  { href: '/properties', label: 'Properties', icon: Building2, match: (p) => p.startsWith('/properties') },
  { href: '/tenants', label: 'Tenants', icon: Users, match: (p) => p.startsWith('/tenants') },
  { href: '/applications', label: 'Applications', icon: ClipboardList, match: (p) => p.startsWith('/applications') },
  { href: '/leases', label: 'Leases', icon: FileText, match: (p) => p.startsWith('/leases') },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench, match: (p) => p === '/maintenance' || (p.startsWith('/maintenance/') && !p.startsWith('/maintenance/vendors')) },
  { href: '/maintenance/vendors', label: 'Vendors', icon: Wrench, match: (p) => p.startsWith('/maintenance/vendors') },
  { href: '/inspections', label: 'Inspections', icon: ClipboardCheck, match: (p) => p.startsWith('/inspections') },
  { href: '/offboarding', label: 'Offboarding', icon: DoorClosed, match: (p) => p.startsWith('/offboarding') },
  { href: '/notices', label: 'Notices', icon: Bell, match: (p) => p.startsWith('/notices') },
  { href: '/outages', label: 'Outages', icon: Zap, match: (p) => p.startsWith('/outages') },
];

const FINANCE_NAV: NavItem[] = [
  { href: '/billing', label: 'Billing', icon: Receipt, match: (p) => p.startsWith('/billing') },
  { href: '/utilities/meters', label: 'Utilities', icon: Gauge, match: (p) => p.startsWith('/utilities') },
  { href: '/payments', label: 'Payments', icon: Wallet, match: (p) => p.startsWith('/payments') },
  { href: '/trust', label: 'Trust', icon: ShieldCheck, match: (p) => p.startsWith('/trust') },
  { href: '/statements', label: 'Statements', icon: FileSpreadsheet, match: (p) => p.startsWith('/statements') },
  { href: '/alerts/usage', label: 'Usage Alerts', icon: Gauge, match: (p) => p.startsWith('/alerts/usage') },
  { href: '/alerts/payments', label: 'Pay Alerts', icon: Wallet, match: (p) => p.startsWith('/alerts/payments') },
];

export function getStaffNavItems(role: string): NavItem[] {
  const items = [...NAV];
  if (role === 'ADMIN' || role === 'PROPERTY_MANAGER' || role === 'FINANCE') {
    items.push(...FINANCE_NAV);
  }
  if (role === 'ADMIN') {
    items.push({
      href: '/settings/team',
      label: 'Settings',
      icon: Settings,
      match: (p) => p.startsWith('/settings/team') || p.startsWith('/settings/org'),
    });
    items.push({
      href: '/settings/features',
      label: 'Features',
      icon: SlidersHorizontal,
      match: (p) => p.startsWith('/settings/features'),
    });
    items.push({
      href: '/settings/integrations',
      label: 'Integrations',
      icon: Plug,
      match: (p) => p.startsWith('/settings/integrations'),
    });
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
  return (
    <SidebarBody
      items={items}
      brand="Regalis"
      subtitle="Property Ops"
      footerLine={orgName ?? email}
    />
  );
}

interface SidebarBodyProps {
  items: NavItem[];
  brand: string;
  subtitle: string;
  footerLine?: string;
  onNavigate?: () => void;
}

export function SidebarBody({
  items,
  brand,
  subtitle,
  footerLine,
  onNavigate,
}: SidebarBodyProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-5">
        <span className="inline-flex overflow-hidden rounded-md dark:bg-white">
          <img src="/regalis.svg" alt={brand} className="h-10 w-auto object-contain" />
        </span>
        <div className="min-w-0">
          <div className="truncate font-serif text-[18px] uppercase tracking-[0.08em] text-sidebar-foreground">
            {brand}
          </div>
          <div className="truncate font-mono text-[9px] uppercase tracking-[0.2em] text-sidebar-primary">
            {subtitle}
          </div>
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
                'group relative flex items-center gap-3 border border-transparent px-3.5 py-3 text-[11px] uppercase tracking-[0.12em] transition-all duration-150',
                active
                  ? 'border-sidebar-border bg-sidebar-accent/90 text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/68 hover:border-sidebar-border/80 hover:bg-sidebar-accent/35 hover:text-sidebar-foreground',
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 bg-sidebar-primary"
                />
              ) : null}
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  active ? 'text-sidebar-primary' : 'text-sidebar-foreground/55 group-hover:text-sidebar-primary',
                )}
              />
              <span className={active ? 'font-semibold text-sidebar-accent-foreground' : 'font-medium'}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      {footerLine ? (
        <div className="border-t border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-3 border border-sidebar-border/80 bg-sidebar-accent/20 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sidebar-primary/25 bg-sidebar-accent text-xs font-semibold text-sidebar-primary">
              {(footerLine?.[0] ?? 'P').toUpperCase()}
            </div>
            <div className="min-w-0 text-xs">
              <div className="truncate text-sm text-sidebar-foreground">{footerLine}</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-sidebar-foreground/45">
                Signed in
              </div>
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
