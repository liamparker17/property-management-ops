import Link from 'next/link';
import { LogOut, User } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

import { Breadcrumbs } from './breadcrumbs';
import { MobileNav } from './mobile-nav';

type Props = {
  email: string;
  signOut: () => Promise<void>;
  variant?: 'staff' | 'tenant';
  role?: string;
  orgName?: string;
};

export function TopBar({ email, signOut, variant = 'staff', role, orgName }: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <MobileNav variant={variant} role={role} email={email} orgName={orgName} />
      <div className="hidden min-w-0 flex-1 lg:flex">
        <Breadcrumbs />
      </div>
      <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
        <ThemeToggle />
        <div className="hidden h-6 w-px bg-border sm:block" />
        <Link
          href={variant === 'tenant' ? '/tenant/profile' : '/profile'}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-2')}
        >
          <User className="size-4" />
          <span className="hidden max-w-[180px] truncate sm:inline">{email}</span>
        </Link>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="gap-1.5">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
