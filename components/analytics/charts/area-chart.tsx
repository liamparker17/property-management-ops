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

export type ChartPoint = {
  x: string;
  y: number;
  y2?: number;
};

type AreaChartProps = {
  data: ChartPoint[];
  height?: number;
};

export function AreaChart({ data, height = 260 }: AreaChartProps) {
  const [primary, secondary] = getSeriesPalette(2);

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
          <YAxis tickLine={false} axisLine={false} width={36} />
          <Tooltip
            contentStyle={{
              background: chartTheme.tooltipSurface,
              borderColor: chartTheme.tooltipBorder,
            }}
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
