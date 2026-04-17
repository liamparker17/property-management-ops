'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function NewRepairForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        description: form.get('description'),
        priority: form.get('priority'),
      }),
    });
    if (res.ok) {
      const json = await res.json();
      router.push(`/tenant/repairs/${json.data.id}`);
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error?.message ?? 'Failed to submit');
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">Title</label>
        <input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={120}
          placeholder="e.g. Kitchen tap is leaking"
          className="h-10 rounded-md border bg-card px-3 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="priority" className="text-sm font-medium">Priority</label>
        <select
          id="priority"
          name="priority"
          defaultValue="MEDIUM"
          className="h-10 rounded-md border bg-card px-3 text-sm"
        >
          <option value="LOW">Low — minor issue</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High — urgent but not emergency</option>
          <option value="URGENT">Urgent — safety or major damage</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">Describe the issue</label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          placeholder="When did it start? What have you noticed?"
          className="rounded-md border bg-card px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit request
      </button>
    </form>
  );
}
