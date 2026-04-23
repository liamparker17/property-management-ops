'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, RefreshCcw } from 'lucide-react';

import type { FeatureFlagKey } from '@/lib/zod/org-features';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

const FEATURE_METADATA: Array<{
  key: FeatureFlagKey;
  title: string;
  description: string;
}> = [
  {
    key: 'UTILITIES_BILLING',
    title: 'Utilities Billing',
    description: 'Prepare metered and service-charge billing workflows for tenant accounts.',
  },
  {
    key: 'TRUST_ACCOUNTING',
    title: 'Trust Accounting',
    description: 'Enable trust-accounting surfaces once the workspace is ready for ledger controls.',
  },
  {
    key: 'AREA_NOTICES',
    title: 'Area Notices',
    description: 'Expose area-level notices and bulletin-style updates for residents.',
  },
  {
    key: 'LANDLORD_APPROVALS',
    title: 'Landlord Approvals',
    description: 'Turn on landlord approval flows for operational decisions that require sign-off.',
  },
  {
    key: 'USAGE_ALERTS',
    title: 'Usage Alerts',
    description: 'Show usage-based warning alerts when the supporting tracking pipeline is enabled.',
  },
  {
    key: 'PAYMENT_ALERTS',
    title: 'Payment Alerts',
    description: 'Enable outbound payment and arrears alert surfaces for the workspace.',
  },
  {
    key: 'ANNUAL_PACKS',
    title: 'Annual Packs',
    description: 'Expose end-of-year landlord packs and reporting bundles.',
  },
];

type FeatureState = Record<FeatureFlagKey, boolean>;

function createEmptyState(): FeatureState {
  return Object.fromEntries(FEATURE_METADATA.map((feature) => [feature.key, false])) as FeatureState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeFeatureState(payload: unknown): FeatureState {
  const source = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const values = createEmptyState();

  if (!isRecord(source)) {
    return values;
  }

  for (const feature of FEATURE_METADATA) {
    const next = source[feature.key];
    if (typeof next === 'boolean') {
      values[feature.key] = next;
    }
  }

  return values;
}

function FeatureFlagsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-44" />
        </div>
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>

      <div className="space-y-3">
        {FEATURE_METADATA.map((feature) => (
          <div
            key={feature.key}
            className="flex items-start justify-between gap-4 rounded-xl border border-border/60 px-4 py-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full max-w-2xl" />
              <Skeleton className="h-3 w-2/3 max-w-xl" />
            </div>
            <Skeleton className="mt-1 h-5 w-9 rounded-full" />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 border-t border-border/60 pt-4">
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function FeatureFlagsForm() {
  const router = useRouter();
  const [initialValues, setInitialValues] = useState<FeatureState>(createEmptyState);
  const [values, setValues] = useState<FeatureState>(createEmptyState);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<null | { ok: boolean; message: string }>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const enabledCount = FEATURE_METADATA.filter((feature) => values[feature.key]).length;
  const isDirty = FEATURE_METADATA.some((feature) => values[feature.key] !== initialValues[feature.key]);

  async function loadFeatures() {
    setLoading(true);
    setStatus(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/settings/features', { cache: 'no-store' });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error?.message ?? 'Failed to load feature flags');
      }

      const next = normalizeFeatureState(json);
      setInitialValues(next);
      setValues(next);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeatures();
  }, []);

  function updateValue(key: FeatureFlagKey, enabled: boolean) {
    setStatus(null);
    setValues((current) => ({ ...current, [key]: enabled }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isDirty) return;

    setPending(true);
    setStatus(null);

    const changedFlags = FEATURE_METADATA.filter(
      (feature) => values[feature.key] !== initialValues[feature.key],
    );

    try {
      for (const feature of changedFlags) {
        const res = await fetch('/api/settings/features', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: feature.key, enabled: values[feature.key] }),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error?.message ?? `Failed to update ${feature.title}`);
        }
      }

      setInitialValues(values);
      setStatus({
        ok: true,
        message:
          changedFlags.length === 1
            ? `${changedFlags[0].title} saved.`
            : `${changedFlags.length} feature settings saved.`,
      });
      router.refresh();
    } catch (error) {
      setStatus({
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to save feature settings',
      });
      await loadFeatures();
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <FeatureFlagsSkeleton />;
  }

  if (errorMessage) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-4">
          <p className="text-sm font-medium text-destructive">Could not load feature flags</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {errorMessage ?? 'The workspace feature settings could not be loaded right now.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => void loadFeatures()}>
            <RefreshCcw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
            Feature rollout
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {enabledCount} of {FEATURE_METADATA.length} modules enabled.
          </p>
        </div>
        {pending ? (
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving
          </div>
        ) : null}
      </div>

      <div className="space-y-1">
        {FEATURE_METADATA.map((feature) => {
          const checked = values[feature.key];
          const switchId = `feature-${feature.key.toLowerCase().replace(/_/g, '-')}`;

          return (
            <div
              key={feature.key}
              className="flex items-start justify-between gap-4 rounded-xl border border-border/60 px-4 py-4"
            >
              <div className="space-y-1">
                <p id={`${switchId}-title`} className="font-medium text-foreground">
                  {feature.title}
                </p>
                <p
                  id={`${switchId}-description`}
                  className="max-w-2xl text-sm leading-6 text-muted-foreground"
                >
                  {feature.description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {checked ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  id={switchId}
                  checked={checked}
                  disabled={pending}
                  aria-labelledby={`${switchId}-title`}
                  aria-describedby={`${switchId}-description`}
                  onCheckedChange={(next) => updateValue(feature.key, next)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
        <Button type="submit" disabled={!isDirty || pending} className="gap-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {pending ? 'Saving changes...' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!isDirty || pending}
          onClick={() => {
            setStatus(null);
            setValues(initialValues);
          }}
        >
          Reset
        </Button>
        <p className="text-xs text-muted-foreground">
          Enable features only when their supporting workflows are ready to go live.
        </p>
      </div>

      {status ? (
        <div
          aria-live="polite"
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            status.ok
              ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
              : 'border-destructive/20 bg-destructive/5 text-destructive'
          }`}
        >
          {status.ok ? <CheckCircle2 className="h-4 w-4" /> : null}
          {status.message}
        </div>
      ) : null}
    </form>
  );
}
