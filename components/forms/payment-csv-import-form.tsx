'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PreviewRow = Record<string, string>;

type ImportResult = {
  createdCount: number;
  skippedCount: number;
  skipped: { row: number; reason: string }[];
};

const DIALECTS = [
  { value: 'generic', label: 'Generic (receivedAt, amount, method, reference, note)' },
  { value: 'fnb', label: 'FNB (M4)' },
  { value: 'absa', label: 'ABSA (M4)' },
  { value: 'standardbank', label: 'Standard Bank (M4)' },
  { value: 'nedbank', label: 'Nedbank (M4)' },
] as const;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        buf += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(buf);
      buf = '';
    } else {
      buf += c;
    }
  }
  out.push(buf);
  return out.map((s) => s.trim());
}

export function PaymentCsvImportForm() {
  const [dialect, setDialect] = useState<string>('generic');
  const [fileName, setFileName] = useState<string>('');
  const [csvText, setCsvText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    if (!csvText) return { headers: [] as string[], rows: [] as PreviewRow[] };
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = parseCsvLine(lines[0]);
    const rows: PreviewRow[] = [];
    for (let r = 1; r < Math.min(lines.length, 11); r++) {
      const cells = parseCsvLine(lines[r]);
      const obj: PreviewRow = {};
      headers.forEach((h, i) => {
        obj[h] = cells[i] ?? '';
      });
      rows.push(obj);
    }
    return { headers, rows };
  }, [csvText]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const f = e.target.files?.[0];
    if (!f) {
      setCsvText('');
      setFileName('');
      return;
    }
    setFileName(f.name);
    const text = await f.text();
    setCsvText(text);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!csvText) {
      setError('Choose a CSV file first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      const blob = new Blob([csvText], { type: 'text/csv' });
      form.append('file', blob, fileName || 'receipts.csv');
      form.append('dialect', dialect);
      const res = await fetch('/api/payments/import', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Import failed');
      } else {
        setResult(json.data as ImportResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="dialect">Bank dialect</Label>
        <select
          id="dialect"
          value={dialect}
          onChange={(e) => setDialect(e.target.value)}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          {DIALECTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">CSV file</Label>
        <Input id="file" type="file" accept=".csv,text/csv" onChange={onFileChange} />
      </div>

      {preview.rows.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Preview (first {preview.rows.length} rows)</div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  {preview.headers.map((h) => (
                    <th key={h} className="px-2 py-1 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="border-t">
                    {preview.headers.map((h) => (
                      <td key={h} className="px-2 py-1">
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && <div className="text-destructive text-sm">{error}</div>}
      {result && (
        <div className="text-sm">
          Imported <strong>{result.createdCount}</strong>, skipped <strong>{result.skippedCount}</strong>.
          {result.skipped.length > 0 && (
            <ul className="mt-2 list-disc pl-6">
              {result.skipped.slice(0, 10).map((s, i) => (
                <li key={i}>
                  Row {s.row}: {s.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button type="submit" disabled={submitting || !csvText}>
        {submitting ? 'Importing…' : 'Import'}
      </Button>
    </form>
  );
}
