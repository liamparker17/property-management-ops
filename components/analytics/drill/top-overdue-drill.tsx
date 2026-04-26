import { formatZar, formatDate } from '@/lib/format';

type OverdueRow = {
  id: string;
  tenant: string;
  property: string;
  unit: string;
  cents: number;
  dueDate: Date;
  ageDays: number;
};

type Props = {
  data: { rows: OverdueRow[] };
};

const TH = 'px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground';

export function TopOverdueDrill({ data }: Props) {
  return (
    <div>
      {data.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No overdue accounts.</p>
      ) : (
        <table className="min-w-full text-sm border border-border">
          <thead className="bg-[color:var(--muted)]/40 text-left">
            <tr>
              <th className={TH}>Tenant</th>
              <th className={TH}>Property / Unit</th>
              <th className={`${TH} text-right`}>Outstanding</th>
              <th className={`${TH} text-right`}>Due</th>
              <th className={`${TH} text-right`}>Age</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className="border-t border-border/60">
                <td className="px-3 py-2 text-foreground">{r.tenant}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.property} / {r.unit}</td>
                <td className="px-3 py-2 text-foreground text-right">{formatZar(r.cents)}</td>
                <td className="px-3 py-2 text-muted-foreground text-right">{formatDate(r.dueDate)}</td>
                <td className="px-3 py-2 text-muted-foreground text-right">{r.ageDays}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
