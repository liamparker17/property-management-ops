import { formatDate } from '@/lib/format';

type MaintenanceRow = {
  id: string;
  title: string;
  priority: string;
  status: string;
  property: string;
  unit: string;
  vendorName: string | null;
  ageDays: number;
  scheduledFor: Date | null;
};

type Props = {
  data: { rows: MaintenanceRow[] };
};

const TH = 'px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground';

function PriorityChip({ priority }: { priority: string }) {
  const cls =
    priority === 'URGENT'
      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      : priority === 'HIGH'
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
      : priority === 'MEDIUM'
      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
      : 'bg-muted text-muted-foreground';

  return (
    <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${cls}`}>
      {priority}
    </span>
  );
}

export function UrgentMaintenanceDrill({ data }: Props) {
  return (
    <div>
      {data.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No urgent maintenance requests.</p>
      ) : (
        <table className="min-w-full text-sm border border-border">
          <thead className="bg-[color:var(--muted)]/40 text-left">
            <tr>
              <th className={TH}>Title</th>
              <th className={TH}>Priority</th>
              <th className={TH}>Status</th>
              <th className={TH}>Property / Unit</th>
              <th className={TH}>Vendor</th>
              <th className={`${TH} text-right`}>Age</th>
              <th className={`${TH} text-right`}>Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className="border-t border-border/60">
                <td className="px-3 py-2 text-foreground">{r.title}</td>
                <td className="px-3 py-2">
                  <PriorityChip priority={r.priority} />
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.status}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.property} / {r.unit}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.vendorName ?? '—'}</td>
                <td className="px-3 py-2 text-muted-foreground text-right">{r.ageDays}d</td>
                <td className="px-3 py-2 text-muted-foreground text-right">
                  {r.scheduledFor ? formatDate(r.scheduledFor) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
