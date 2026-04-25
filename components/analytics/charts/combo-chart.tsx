'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { chartTheme } from '@/lib/analytics/chart-theme';
import { formatZar } from '@/lib/format';

export type ComboChartPoint = {
  x: string;
  bars: number;
  line: number;
  priorLine?: number;
};

type ComboChartProps = {
  data: ComboChartPoint[];
  height?: number;
  yFormat?: 'cents' | 'count';
  seriesLabels?: { bars?: string; line?: string; priorLine?: string };
};

function formatTickCurrency(value: number): string {
  const rand = value / 100;
  const abs = Math.abs(rand);
  if (abs >= 1_000_000) {
    const m = rand / 1_000_000;
    return `R${m >= 10 ? Math.round(m) : m.toFixed(1)}M`;
  }
  if (abs >= 1_000) return `R${Math.round(rand / 1_000)}k`;
  return `R${Math.round(rand)}`;
}

function formatTick(value: number, mode: 'cents' | 'count'): string {
  return mode === 'cents' ? formatTickCurrency(value) : String(value);
}

type TooltipPayloadEntry = { dataKey?: string | number; value?: number | string; color?: string };
type TooltipProps = { active?: boolean; label?: string; payload?: TooltipPayloadEntry[] };

function buildTooltip(yFormat: 'cents' | 'count', labels: ComboChartProps['seriesLabels']) {
  const labelFor = (key: unknown) => {
    if (key === 'bars') return labels?.bars ?? 'Bars';
    if (key === 'line') return labels?.line ?? 'Line';
    if (key === 'priorLine') return labels?.priorLine ?? 'Prior';
    return String(key ?? '');
  };
  const fmt = (raw: unknown) => {
    const n = typeof raw === 'number' ? raw : Number(raw ?? 0);
    if (!Number.isFinite(n)) return '—';
    return yFormat === 'cents' ? formatZar(n) : n.toLocaleString();
  };

  function ChartTooltip({ active, label, payload }: TooltipProps) {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: chartTheme.tooltipSurface,
          border: `1px solid ${chartTheme.tooltipBorder}`,
          borderRadius: 6,
          padding: '8px 10px',
          fontSize: 12,
          color: chartTheme.text,
          minWidth: 160,
        }}
      >
        <div style={{ fontFamily: chartTheme.fonts.eyebrow, fontSize: 10, opacity: 0.7, marginBottom: 4 }}>{label}</div>
        {payload.map((entry, i) => (
          <div key={`${entry.dataKey}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: entry.color }}>{labelFor(entry.dataKey)}</span>
            <span>{fmt(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return ChartTooltip;
}

export function ComboChart({ data, height = 260, yFormat = 'count', seriesLabels }: ComboChartProps) {
  const showLegend = Boolean(seriesLabels?.bars || seriesLabels?.line || seriesLabels?.priorLine);
  const showPrior = data.some((p) => typeof p.priorLine === 'number');
  const Tip = buildTooltip(yFormat, seriesLabels);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={chartTheme.gridStroke} vertical={false} />
          <XAxis dataKey="x" stroke={chartTheme.axisStroke} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            stroke={chartTheme.axisStroke}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatTick(Number(v), yFormat)}
          />
          <Tooltip content={<Tip />} cursor={{ fill: chartTheme.surfaceMuted, opacity: 0.4 }} />
          {showLegend ? <Legend wrapperStyle={{ fontSize: 11, paddingBottom: 4 }} /> : null}
          <Bar
            dataKey="bars"
            name={seriesLabels?.bars ?? 'Bars'}
            fill={chartTheme.seriesA}
            radius={[2, 2, 0, 0]}
            maxBarSize={28}
          />
          <Line
            dataKey="line"
            name={seriesLabels?.line ?? 'Line'}
            stroke={chartTheme.seriesB}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
          {showPrior ? (
            <Line
              dataKey="priorLine"
              name={seriesLabels?.priorLine ?? 'Prior'}
              stroke={chartTheme.seriesB}
              strokeWidth={1.25}
              strokeDasharray="4 4"
              strokeOpacity={0.45}
              dot={false}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
