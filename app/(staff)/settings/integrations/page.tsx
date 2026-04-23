import { Plug } from 'lucide-react';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { listOrgIntegrations } from '@/lib/services/org-integrations';
import { integrationProviders } from '@/lib/zod/org-integrations';
import type { IntegrationProvider } from '@prisma/client';

import { IntegrationRow } from './connect-modal';

const PROVIDER_LABELS: Record<string, { label: string; description: string }> = {
  STITCH_PAYMENTS: {
    label: 'Stitch Payments',
    description: 'Tenant "Pay now" card/EFT checkout via Stitch Connect.',
  },
  STITCH_DEBICHECK: {
    label: 'Stitch DebiCheck',
    description: 'DebiCheck mandates and monthly collections.',
  },
  STITCH_PAYOUTS: {
    label: 'Stitch Payouts',
    description: 'Landlord disbursement payouts initiated from trust ledger.',
  },
  QUICKBOOKS: {
    label: 'QuickBooks Online',
    description: 'Per-org QBO realm for reconciliation + bookkeeping.',
  },
  TPN: {
    label: 'TPN',
    description: 'Tenant Profile Network screening for application vetting.',
  },
};

export default async function IntegrationSettingsPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  const ctx = {
    orgId: session.user.orgId,
    userId: session.user.id,
    role: session.user.role,
  };
  const rows = await listOrgIntegrations(ctx);
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Integrations"
        description="Connect per-workspace credentials for Stitch payments, QuickBooks Online, and TPN screening. Tokens are AES-256-GCM encrypted at rest."
      />

      <Card className="max-w-4xl">
        <CardHeader className="flex-row items-center gap-2.5 space-y-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plug className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Providers</CardTitle>
            <CardDescription>
              Each workspace connects its own credentials. Liability for partner fees stays with the
              org that connected the provider.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {integrationProviders.map((provider) => {
            const row = byProvider.get(provider as IntegrationProvider);
            const meta = PROVIDER_LABELS[provider];
            return (
              <IntegrationRow
                key={provider}
                provider={provider}
                label={meta.label}
                description={meta.description}
                status={row?.status ?? 'DISCONNECTED'}
                externalAccountId={row?.externalAccountId ?? null}
                lastError={row?.lastError ?? null}
              />
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
