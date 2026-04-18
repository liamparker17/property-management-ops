'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';

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
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setMounted(true);
  }, []);

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
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="lg:hidden text-foreground"
      >
        <Menu className="size-5" />
      </Button>
      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[100] lg:hidden">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setOpen(false)}
              />
              <div
                className="absolute inset-y-0 left-0 flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl animate-in slide-in-from-left duration-300"
                role="dialog"
                aria-modal="true"
                aria-label="Navigation"
                style={{ backgroundColor: 'var(--sidebar)' }}
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
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
