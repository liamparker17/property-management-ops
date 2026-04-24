'use client';

import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { chartTheme, getSeriesPalette } from '@/lib/analytics/chart-theme';
import { formatZar } from '@/lib/format';

export type ChartPoint = {
  x: string;
  y: number;
  y2?: number;
};

type AreaChartProps = {
  data: ChartPoint[];
  height?: number;
  /**
   * 'cents' formats Y-axis + tooltip as ZAR currency (divides by 100).
   * 'count' leaves raw numbers untouched (for counts/status charts).
   */
  yFormat?: 'cents' | 'count';
  /**
   * Series labels shown in tooltip + legend.
   * When provided, a visible legend is rendered above the chart.
   * Sparkline / KPI usages omit this and get a clean, label-free chart.
   */
  seriesLabels?: { y?: string; y2?: string };
};

function formatTickCurrency(value: number): string {
  const rand = value / 100;
  const abs = Math.abs(rand);
  if (abs >= 1_000_000) {
    const m = rand / 1_000_000;
    // 3.3M, 12M, 0.4M
    return `R${m >= 10 ? Math.round(m) : m.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `R${Math.round(rand / 1_000)}k`;
  }
  return `R${Math.round(rand)}`;
}

function formatTick(value: number, mode: 'cents' | 'count'): string {
  if (mode === 'cents') return formatTickCurrency(value);
  return String(value);
}

type TooltipPayloadEntry = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  stroke?: string;
};

type TooltipProps = {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadEntry[];
};

function buildTooltip(
  yFormat: 'cents' | 'count',
  seriesLabels: { y?: string; y2?: string } | undefined,
) {
  const labelFor = (key: unknown): string => {
    if (key === 'y') return seriesLabels?.y ?? 'Series 1';
    if (key === 'y2') return seriesLabels?.y2 ?? 'Series 2';
    return String(key ?? '');
  };
  const formatValue = (raw: unknown): string => {
    const num = typeof raw === 'number' ? raw : Number(raw ?? 0);
    if (!Number.isFinite(num)) return '—';
    return yFormat === 'cents' ? formatZar(num) : num.toLocaleString();
  };

  function ChartTooltip({ active, label, payload }: TooltipProps) {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div
        style={{
          background: chartTheme.tooltipSurface,
          border: `1px solid ${chartTheme.tooltipBorder}`,
          borderRadius: 6,
          padding: '8px 10px',
          fontSize: 12,
          lineHeight: 1.35,
          color: chartTheme.text,
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          minWidth: 140,
        }}
      >
        <div
          style={{
            fontFamily: chartTheme.fonts.eyebrow,
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: chartTheme.textMuted,
            marginBottom: 6,
          }}
        >
          {label}
        </div>
        {payload.map((entry, idx) => {
          const swatch = entry.color ?? entry.stroke ?? chartTheme.text;
          return (
            <div
              key={`${entry.dataKey ?? idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginTop: idx === 0 ? 0 : 4,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: swatch,
                  }}
                />
                <span style={{ color: chartTheme.textMuted }}>{labelFor(entry.dataKey)}</span>
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: chartTheme.text }}>
                {formatValue(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return ChartTooltip;
}

export function AreaChart({ data, height = 260, yFormat = 'count', seriesLabels }: AreaChartProps) {
  const [primary, secondary] = getSeriesPalette(2);
  const hasY2 = data.some((point) => typeof point.y2 === 'number');
  const showLegend = Boolean(seriesLabels && (seriesLabels.y || seriesLabels.y2));

  const legendFormatter = (value: unknown): string => {
    if (value === 'y') return seriesLabels?.y ?? 'Series 1';
    if (value === 'y2') return seriesLabels?.y2 ?? 'Series 2';
    return String(value ?? '');
  };

  // Heuristic: rotate x labels when many points or labels are wide ("May 2025").
  const tickCount = data.length;
  const rotate = tickCount > 6;
  const TooltipContent = buildTooltip(yFormat, seriesLabels);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data}
          margin={{ top: 12, right: 16, bottom: rotate ? 24 : 8, left: 0 }}
        >
          <defs>
            <linearGradient id="analytics-area-primary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primary} stopOpacity={0.32} />
              <stop offset="95%" stopColor={primary} stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="analytics-area-secondary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={secondary} stopOpacity={0.22} />
              <stop offset="95%" stopColor={secondary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chartTheme.gridStroke} vertical={false} />
          <XAxis
            dataKey="x"
            tickLine={false}
            axisLine={{ stroke: chartTheme.axisStroke }}
            tick={{ fill: chartTheme.textMuted, fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={16}
            angle={rotate ? -30 : 0}
            textAnchor={rotate ? 'end' : 'middle'}
            height={rotate ? 44 : 24}
            dy={rotate ? 4 : 6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={yFormat === 'cents' ? 56 : 36}
            tick={{ fill: chartTheme.textMuted, fontSize: 11 }}
            tickFormatter={(value: number) => formatTick(value, yFormat)}
          />
          <Tooltip
            cursor={{ stroke: chartTheme.axisStroke, strokeDasharray: '3 3' }}
            content={<TooltipContent />}
          />
          {showLegend ? (
            <Legend
              verticalAlign="top"
              align="right"
              height={28}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                fontSize: 12,
                color: chartTheme.textMuted,
                paddingBottom: 4,
              }}
              formatter={legendFormatter}
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="y"
            stroke={primary}
            fill="url(#analytics-area-primary)"
            strokeWidth={2}
            activeDot={{ r: 4, strokeWidth: 0, fill: primary }}
            name={seriesLabels?.y ?? 'y'}
          />
          {hasY2 ? (
            <Area
              type="monotone"
              dataKey="y2"
              stroke={secondary}
              fill="url(#analytics-area-secondary)"
              strokeWidth={2}
              activeDot={{ r: 4, strokeWidth: 0, fill: secondary }}
              name={seriesLabels?.y2 ?? 'y2'}
            />
          ) : null}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
