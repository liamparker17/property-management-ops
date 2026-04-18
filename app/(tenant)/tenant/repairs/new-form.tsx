'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const NATIVE_SELECT =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

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
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={120}
          placeholder="e.g. Kitchen tap is leaking"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="priority">Priority</Label>
        <select id="priority" name="priority" defaultValue="MEDIUM" className={NATIVE_SELECT}>
          <option value="LOW">Low — minor issue</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High — urgent but not emergency</option>
          <option value="URGENT">Urgent — safety or major damage</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Describe the issue</Label>
        <Textarea
          id="description"
          name="description"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          placeholder="When did it start? What have you noticed?"
        />
      </div>
      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Submit request
      </Button>
    </form>
  );
}
