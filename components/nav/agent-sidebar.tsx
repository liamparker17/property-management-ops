'use client';

import { Bell, Building2, ClipboardCheck, LayoutDashboard, Wrench, Zap } from 'lucide-react';

import { SidebarBody } from './sidebar';

const NAV = [
  { href: '/agent', label: 'Operations Dash', icon: LayoutDashboard, match: (p: string) => p === '/agent' },
  { href: '/agent/properties', label: 'Properties', icon: Building2, match: (p: string) => p.startsWith('/agent/properties') },
  { href: '/agent/maintenance', label: 'Maintenance', icon: Wrench, match: (p: string) => p.startsWith('/agent/maintenance') },
  { href: '/agent/repairs', label: 'Repairs', icon: Wrench, match: (p: string) => p.startsWith('/agent/repairs') },
  { href: '/agent/inspections', label: 'Inspections', icon: ClipboardCheck, match: (p: string) => p.startsWith('/agent/inspections') },
  { href: '/agent/notices', label: 'Notices', icon: Bell, match: (p: string) => p.startsWith('/agent/notices') },
  { href: '/agent/outages', label: 'Outages', icon: Zap, match: (p: string) => p.startsWith('/agent/outages') },
];

export function getAgentNavItems() {
  return NAV;
}

interface AgentSidebarProps {
  email?: string;
}

export function AgentSidebar({ email }: AgentSidebarProps = {}) {
  return <SidebarBody items={NAV} brand="Regalis" subtitle="Agent Portal" footerLine={email} />;
}

export function DesktopAgentSidebar({ email }: AgentSidebarProps = {}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border lg:block">
      <AgentSidebar email={email} />
    </aside>
  );
}
