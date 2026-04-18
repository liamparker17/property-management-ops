'use client';

import * as React from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { SidebarBody, getStaffNavItems } from './sidebar';
import { getTenantNavItems } from './tenant-sidebar';

interface MobileNavProps {
  variant: 'staff' | 'tenant';
  role?: string;
  email?: string;
  orgName?: string;
}

export function MobileNav({ variant, role, email, orgName }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  const items =
    variant === 'staff' ? getStaffNavItems(role ?? 'PROPERTY_MANAGER') : getTenantNavItems();
  const brand = variant === 'staff' ? 'PMOps' : 'Tenant Portal';
  const footerLine = variant === 'staff' ? orgName ?? email : email;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="lg:hidden"
      >
        <Menu className="size-5" />
      </Button>
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <div
          className={cn(
            'absolute inset-0 bg-foreground/40 backdrop-blur-sm transition-opacity duration-200',
            open ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex h-full w-72 flex-col bg-sidebar shadow-elevated transition-transform duration-300 ease-out',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div className="absolute right-2 top-3 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close navigation menu"
              className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
          <SidebarBody
            items={items}
            brand={brand}
            footerLine={footerLine}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </div>
    </>
  );
}
