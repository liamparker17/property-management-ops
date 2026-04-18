import Link from 'next/link';
import { Download, FileText } from 'lucide-react';

import { auth } from '@/lib/auth';
import { listTenantDocuments } from '@/lib/services/tenant-portal';
import { formatDate } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function TenantDocumentsPage() {
  const session = await auth();
  const docs = await listTenantDocuments(session!.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Documents"
        description={`${docs.length} ${docs.length === 1 ? 'document' : 'documents'} available to you.`}
      />

      {docs.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-5" />}
          title="No documents yet"
          description="Your property manager will upload them here."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {docs.map((doc) => (
                  <tr key={doc.id} className="transition-colors duration-150 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <span className="truncate font-medium">{doc.filename}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {doc.kind.replaceAll('_', ' ').toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {doc.lease?.unit.property.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatBytes(doc.sizeBytes)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(doc.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/api/documents/${doc.id}/download`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
