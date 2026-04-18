'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  properties: 'Properties',
  tenants: 'Tenants',
  leases: 'Leases',
  maintenance: 'Maintenance',
  units: 'Units',
  profile: 'Profile',
  settings: 'Settings',
  team: 'Team',
  org: 'Organisation',
  new: 'New',
  edit: 'Edit',
  renew: 'Renew',
  onboard: 'Onboard',
  tenant: 'Home',
  lease: 'My Lease',
  invoices: 'Invoices',
  documents: 'Documents',
  repairs: 'Repairs',
};

function humanise(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (/^[a-z0-9]{20,}$/i.test(segment)) return 'Detail';
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/');
    return { href, label: humanise(segment), last: idx === segments.length - 1 };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center text-sm">
      <ol className="flex min-w-0 items-center gap-1.5">
        {crumbs.map((crumb, idx) => (
          <Fragment key={crumb.href}>
            {idx > 0 ? (
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
            ) : null}
            {crumb.last ? (
              <span className="truncate font-semibold text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="truncate text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
