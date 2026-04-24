'use client';

import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { chartTheme, getSeriesPalette } from '@/lib/analytics/chart-theme';
import type { ChartPoint } from '@/components/analytics/charts/area-chart';

type BarChartProps = {
  data: ChartPoint[];
  height?: number;
};

export function BarChart({ data, height = 260 }: BarChartProps) {
  const [primary, secondary] = getSeriesPalette(2);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={chartTheme.gridStroke} vertical={false} />
          <XAxis dataKey="x" tickLine={false} axisLine={{ stroke: chartTheme.axisStroke }} />
          <YAxis tickLine={false} axisLine={false} width={36} />
          <Tooltip
            contentStyle={{
              background: chartTheme.tooltipSurface,
              borderColor: chartTheme.tooltipBorder,
            }}
          />
          <Bar dataKey="y" fill={primary} radius={[2, 2, 0, 0]} />
          {data.some((point) => typeof point.y2 === 'number') ? (
            <Bar dataKey="y2" fill={secondary} radius={[2, 2, 0, 0]} />
          ) : null}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
