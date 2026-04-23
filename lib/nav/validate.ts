import fs from 'node:fs';
import path from 'node:path';

import { getAgentNavItems } from '../../components/nav/agent-sidebar';
import { getLandlordNavItems } from '../../components/nav/landlord-sidebar';
import { getStaffNavItems } from '../../components/nav/sidebar';
import { getTenantNavItems } from '../../components/nav/tenant-sidebar';

export type NavSidebar = 'staff' | 'tenant' | 'landlord' | 'agent';

export type MissingNavPage = {
  href: string;
  sidebar: NavSidebar;
};

export type NavValidationResult = {
  missing: MissingNavPage[];
};

type NavItem = {
  href: string;
};

const APP_DIR = path.join(process.cwd(), 'app');
const DYNAMIC_SEGMENT_PATTERN = /^\[.+\]$/;

function collectPageFiles(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectPageFiles(fullPath, files);
      continue;
    }

    if (entry.isFile() && entry.name === 'page.tsx') {
      files.push(fullPath);
    }
  }

  return files;
}

function pageFileToRoute(pageFile: string): string {
  const pageDir = path.dirname(pageFile);
  const relativeDir = path.relative(APP_DIR, pageDir);
  const segments = relativeDir
    .split(path.sep)
    .filter(Boolean)
    .filter((segment) => !/^\(.+\)$/.test(segment));

  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

function routeMatchesHref(route: string, href: string): boolean {
  if (route === href) {
    return true;
  }

  const routeSegments = route.split('/').filter(Boolean);
  const hrefSegments = href.split('/').filter(Boolean);

  if (routeSegments.length !== hrefSegments.length) {
    return false;
  }

  return routeSegments.every((routeSegment, index) => {
    const hrefSegment = hrefSegments[index];

    return (
      routeSegment === hrefSegment ||
      DYNAMIC_SEGMENT_PATTERN.test(routeSegment) ||
      DYNAMIC_SEGMENT_PATTERN.test(hrefSegment)
    );
  });
}

function dedupeNavItems(items: NavItem[]): NavItem[] {
  const hrefs = new Set<string>();

  return items.filter((item) => {
    if (hrefs.has(item.href)) {
      return false;
    }

    hrefs.add(item.href);
    return true;
  });
}

function getNavEntries(): Array<{ href: string; sidebar: NavSidebar }> {
  return [
    ...dedupeNavItems(getStaffNavItems('ADMIN')).map((item) => ({
      href: item.href,
      sidebar: 'staff' as const,
    })),
    ...dedupeNavItems(getTenantNavItems()).map((item) => ({
      href: item.href,
      sidebar: 'tenant' as const,
    })),
    ...dedupeNavItems(getLandlordNavItems()).map((item) => ({
      href: item.href,
      sidebar: 'landlord' as const,
    })),
    ...dedupeNavItems(getAgentNavItems()).map((item) => ({
      href: item.href,
      sidebar: 'agent' as const,
    })),
  ];
}

export function validateNav(): NavValidationResult {
  const routes = collectPageFiles(APP_DIR).map(pageFileToRoute);
  const missing = getNavEntries().filter(
    ({ href }) => !routes.some((route) => routeMatchesHref(route, href)),
  );

  return { missing };
}
