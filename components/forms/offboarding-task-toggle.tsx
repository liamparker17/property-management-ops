'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Checkbox } from '@/components/ui/checkbox';

export function OffboardingTaskToggle({
  caseId,
  taskId,
  initialDone,
  label,
  disabled,
}: {
  caseId: string;
  taskId: string;
  initialDone: boolean;
  label: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initialDone);
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setDone(next);
    startTransition(async () => {
      const res = await fetch(`/api/offboarding/${caseId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ done: next }),
      });
      if (!res.ok) {
        setDone(!next);
      }
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
      <Checkbox
        checked={done}
        onCheckedChange={(checked) => toggle(checked === true)}
        disabled={disabled || isPending}
      />
      <span className={done ? 'text-muted-foreground line-through' : 'text-foreground'}>{label}</span>
    </label>
  );
}
