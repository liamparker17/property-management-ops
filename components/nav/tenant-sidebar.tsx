'use client';

import { Home, FileText, Folder, User, Wrench, Receipt, CreditCard, ClipboardCheck } from 'lucide-react';

import { SidebarBody } from './sidebar';

const NAV = [
  { href: '/tenant', label: 'Home', icon: Home, match: (p: string) => p === '/tenant' },
  { href: '/tenant/lease', label: 'My Lease', icon: FileText, match: (p: string) => p.startsWith('/tenant/lease') },
  { href: '/tenant/invoices', label: 'Invoices', icon: Receipt, match: (p: string) => p.startsWith('/tenant/invoices') },
  { href: '/tenant/payments', label: 'Payments', icon: CreditCard, match: (p: string) => p.startsWith('/tenant/payments') },
  { href: '/tenant/repairs', label: 'Repairs', icon: Wrench, match: (p: string) => p.startsWith('/tenant/repairs') },
  { href: '/tenant/inspections', label: 'Inspections', icon: ClipboardCheck, match: (p: string) => p.startsWith('/tenant/inspections') },
  { href: '/tenant/documents', label: 'Documents', icon: Folder, match: (p: string) => p.startsWith('/tenant/documents') },
  { href: '/tenant/profile', label: 'Profile', icon: User, match: (p: string) => p.startsWith('/tenant/profile') },
];

export function getTenantNavItems() {
  return NAV;
}

interface TenantSidebarProps {
  email?: string;
}

export function TenantSidebar({ email }: TenantSidebarProps = {}) {
  return <SidebarBody items={NAV} brand="Regalis" subtitle="Tenant Portal" footerLine={email} />;
}

export function DesktopTenantSidebar({ email }: TenantSidebarProps = {}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border lg:block">
      <TenantSidebar email={email} />
    </aside>
  );
}
