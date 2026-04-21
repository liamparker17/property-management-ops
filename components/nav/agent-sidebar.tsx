'use client';

import { LayoutDashboard, Building, Wrench, User } from 'lucide-react';

import { SidebarBody } from './sidebar';

const NAV = [
  { href: '/agent', label: 'Operations Dash', icon: LayoutDashboard, match: (p: string) => p === '/agent' },
  { href: '/agent/properties', label: 'Properties', icon: Building, match: (p: string) => p.startsWith('/agent/properties') },
  { href: '/agent/repairs', label: 'Approvals Hub', icon: Wrench, match: (p: string) => p.startsWith('/agent/repairs') },
  { href: '/agent/profile', label: 'Profile', icon: User, match: (p: string) => p.startsWith('/agent/profile') },
];

export function getAgentNavItems() {
  return NAV;
}

interface AgentSidebarProps {
  email?: string;
}

export function AgentSidebar({ email }: AgentSidebarProps = {}) {
  return <SidebarBody items={NAV} brand="Agent Portal" footerLine={email} />;
}

export function DesktopAgentSidebar({ email }: AgentSidebarProps = {}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border lg:block">
      <AgentSidebar email={email} />
    </aside>
  );
}
