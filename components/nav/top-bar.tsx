import Link from 'next/link';
import { LogOut, User } from 'lucide-react';

type Props = {
  email: string;
  signOut: () => Promise<void>;
};

export function TopBar({ email, signOut }: Props) {
  return (
    <header className="flex h-14 items-center justify-end gap-3 border-b bg-background px-6">
      <Link
        href="/profile"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <User className="h-4 w-4" />
        {email}
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </form>
    </header>
  );
}
