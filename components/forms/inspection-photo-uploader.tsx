'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'] as const;

export function InspectionPhotoUploader({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState('');

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type as (typeof ALLOWED)[number])) {
      setError('Only PNG, JPEG, or WebP images are supported.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const signedRes = await fetch(`/api/inspection-items/${itemId}/photos/signed-url`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contentType: file.type }),
      });
      const signedJson = await signedRes.json();
      if (!signedRes.ok) {
        setError(signedJson?.error?.message ?? 'Failed to get upload URL');
        return;
      }
      const { uploadUrl, storageKey } = signedJson.data as { uploadUrl: string; storageKey: string };

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type },
        body: file,
      });
      if (!putRes.ok) {
        setError('Upload failed');
        return;
      }

      const registerRes = await fetch(`/api/inspection-items/${itemId}/photos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ storageKey, ...(caption.trim() ? { caption: caption.trim() } : {}) }),
      });
      const registerJson = await registerRes.json();
      if (!registerRes.ok) {
        setError(registerJson?.error?.message ?? 'Failed to register photo');
        return;
      }
      setCaption('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
        <span>{busy ? 'Uploading…' : 'Upload photo'}</span>
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
