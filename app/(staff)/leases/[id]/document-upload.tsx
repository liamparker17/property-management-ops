'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function DocumentUpload({ leaseId }: { leaseId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setPending(true);
    setError(null);
    const res = await fetch(`/api/leases/${leaseId}/documents`, {
      method: 'POST',
      body: fd,
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed');
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3 text-sm">
      <input
        name="file"
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        required
        className="block w-full max-w-xs cursor-pointer rounded-md border border-input bg-background text-sm text-foreground file:mr-3 file:cursor-pointer file:border-0 file:border-r file:border-input file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/70"
      />
      <Button type="submit" disabled={pending} size="sm">
        <Upload className="size-4" />
        {pending ? 'Uploading…' : 'Upload'}
      </Button>
      {error && <span className="text-destructive">{error}</span>}
    </form>
  );
}
