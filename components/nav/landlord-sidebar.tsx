'use client';

import { Bell, Building2, FileSpreadsheet, Home, Receipt, Wrench, Zap } from 'lucide-react';

import { SidebarBody } from './sidebar';

const NAV = [
  { href: '/landlord', label: 'Portfolio', icon: Home, match: (p: string) => p === '/landlord' },
  { href: '/landlord/properties', label: 'Properties', icon: Building2, match: (p: string) => p.startsWith('/landlord/properties') },
  { href: '/landlord/maintenance', label: 'Maintenance', icon: Wrench, match: (p: string) => p.startsWith('/landlord/maintenance') },
  { href: '/landlord/invoices', label: 'Invoices', icon: Receipt, match: (p: string) => p.startsWith('/landlord/invoices') },
  { href: '/landlord/statements', label: 'Statements', icon: FileSpreadsheet, match: (p: string) => p.startsWith('/landlord/statements') },
  { href: '/landlord/reports', label: 'Reports', icon: FileSpreadsheet, match: (p: string) => p.startsWith('/landlord/reports') },
  { href: '/landlord/notices', label: 'Notices', icon: Bell, match: (p: string) => p.startsWith('/landlord/notices') },
  { href: '/landlord/outages', label: 'Outages', icon: Zap, match: (p: string) => p.startsWith('/landlord/outages') },
];

export function getLandlordNavItems() {
  return NAV;
}

interface LandlordSidebarProps {
  email?: string;
}

export function LandlordSidebar({ email }: LandlordSidebarProps = {}) {
  return <SidebarBody items={NAV} brand="Regalis" subtitle="Landlord Portal" footerLine={email} />;
}

export function DesktopLandlordSidebar({ email }: LandlordSidebarProps = {}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border lg:block">
      <LandlordSidebar email={email} />
    </aside>
  );
}
