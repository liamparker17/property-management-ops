'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
    <form onSubmit={onSubmit} className="flex items-center gap-3 text-sm">
      <input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Uploading…' : 'Upload'}
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </form>
  );
}
