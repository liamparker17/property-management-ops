'use client';

import { Home } from 'lucide-react';

import { SidebarBody } from './sidebar';

// T-P0-10 / decision #7: keep landlord nav to routes that already exist in this milestone.
// The fuller landlord portal lands later, and dead links would be more misleading than helpful.
const NAV = [
  { href: '/landlord', label: 'Portfolio', icon: Home, match: (p: string) => p === '/landlord' },
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
