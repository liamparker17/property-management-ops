'use client';

import { Home, Building, FileText, Wrench, Receipt, User } from 'lucide-react';

import { SidebarBody } from './sidebar';

const NAV = [
  { href: '/landlord', label: 'Portfolio', icon: Home, match: (p: string) => p === '/landlord' },
  { href: '/landlord/properties', label: 'Properties', icon: Building, match: (p: string) => p.startsWith('/landlord/properties') },
  { href: '/landlord/leases', label: 'Leases', icon: FileText, match: (p: string) => p.startsWith('/landlord/leases') },
  { href: '/landlord/invoices', label: 'Financials', icon: Receipt, match: (p: string) => p.startsWith('/landlord/invoices') },
  { href: '/landlord/repairs', label: 'Maintenance Hub', icon: Wrench, match: (p: string) => p.startsWith('/landlord/repairs') },
  { href: '/landlord/profile', label: 'Profile', icon: User, match: (p: string) => p.startsWith('/landlord/profile') },
];

export function getLandlordNavItems() {
  return NAV;
}

interface LandlordSidebarProps {
  email?: string;
}

export function LandlordSidebar({ email }: LandlordSidebarProps = {}) {
  return <SidebarBody items={NAV} brand="Landlord Portal" footerLine={email} />;
}

export function DesktopLandlordSidebar({ email }: LandlordSidebarProps = {}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border lg:block">
      <LandlordSidebar email={email} />
    </aside>
  );
}
