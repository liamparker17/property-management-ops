import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getVendor } from '@/lib/services/vendors';
import { VendorForm, ArchiveVendorButton } from '@/components/forms/vendor-form';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };

  let vendor;
  try {
    vendor = await getVendor(ctx, id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/maintenance/vendors"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Vendors
      </Link>

      <PageHeader
        eyebrow="Vendor"
        title={vendor.name}
        description={vendor.archivedAt ? `Archived ${formatDate(vendor.archivedAt)}` : `Created ${formatDate(vendor.createdAt)}`}
        actions={<ArchiveVendorButton id={vendor.id} archived={Boolean(vendor.archivedAt)} />}
      />

      <Card className="max-w-3xl">
        <CardContent className="p-6">
          <VendorForm
            initial={{
              id: vendor.id,
              name: vendor.name,
              contactName: vendor.contactName,
              contactEmail: vendor.contactEmail,
              contactPhone: vendor.contactPhone,
              categories: vendor.categories,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
