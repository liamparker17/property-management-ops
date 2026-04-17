import Link from 'next/link';
import { Download, FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { listTenantDocuments } from '@/lib/services/tenant-portal';
import { formatDate } from '@/lib/format';

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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {docs.length} {docs.length === 1 ? 'document' : 'documents'} available to you.
        </p>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No documents yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your property manager will upload them here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {docs.map((doc) => (
                <tr key={doc.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate font-medium">{doc.filename}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {doc.kind.replaceAll('_', ' ').toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {doc.lease?.unit.property.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatBytes(doc.sizeBytes)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/api/documents/${doc.id}/download`}
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
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
      )}
    </div>
  );
}
