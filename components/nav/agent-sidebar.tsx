'use client';

import { LayoutDashboard } from 'lucide-react';

import { SidebarBody } from './sidebar';

// T-P0-10 / decision #7: keep agent nav on the dashboard route until later-milestone pages are built.
// Missing destinations are reported by the planner script instead of being shipped as dead links.
const NAV = [
  { href: '/agent', label: 'Operations Dash', icon: LayoutDashboard, match: (p: string) => p === '/agent' },
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
