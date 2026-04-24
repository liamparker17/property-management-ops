'use client';

import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
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
  /** Series labels shown in the tooltip. Defaults to y / y2. */
  seriesLabels?: { y?: string; y2?: string };
};

function formatTick(value: number, mode: 'cents' | 'count'): string {
  if (mode === 'cents') {
    const rand = value / 100;
    if (Math.abs(rand) >= 1_000_000) return `R${(rand / 1_000_000).toFixed(1)}M`;
    if (Math.abs(rand) >= 1_000) return `R${Math.round(rand / 1_000)}k`;
    return `R${Math.round(rand)}`;
  }
  return String(value);
}

export function AreaChart({ data, height = 260, yFormat = 'count', seriesLabels }: AreaChartProps) {
  const [primary, secondary] = getSeriesPalette(2);
  const tooltipFormatter = (value: unknown, name: unknown): [string, string] => {
    const num = typeof value === 'number' ? value : Number(value ?? 0);
    const display = yFormat === 'cents' ? formatZar(num) : String(num);
    const label = name === 'y' ? seriesLabels?.y ?? 'Series 1' : seriesLabels?.y2 ?? 'Series 2';
    return [display, label];
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
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
          <XAxis dataKey="x" tickLine={false} axisLine={{ stroke: chartTheme.axisStroke }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={yFormat === 'cents' ? 52 : 36}
            tickFormatter={(value: number) => formatTick(value, yFormat)}
          />
          <Tooltip
            contentStyle={{
              background: chartTheme.tooltipSurface,
              borderColor: chartTheme.tooltipBorder,
            }}
            formatter={tooltipFormatter}
          />
          <Area
            type="monotone"
            dataKey="y"
            stroke={primary}
            fill="url(#analytics-area-primary)"
            strokeWidth={2}
          />
          {data.some((point) => typeof point.y2 === 'number') ? (
            <Area
              type="monotone"
              dataKey="y2"
              stroke={secondary}
              fill="url(#analytics-area-secondary)"
              strokeWidth={2}
            />
          ) : null}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
