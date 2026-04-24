'use client';

import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { chartTheme, getSeriesPalette } from '@/lib/analytics/chart-theme';

type DonutPoint = {
  x: string;
  y: number;
};

type DonutChartProps = {
  data: DonutPoint[];
  height?: number;
};

export function DonutChart({ data, height = 260 }: DonutChartProps) {
  const palette = getSeriesPalette(data.length);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Tooltip
            contentStyle={{
              background: chartTheme.tooltipSurface,
              borderColor: chartTheme.tooltipBorder,
            }}
          />
          <Pie
            data={data}
            dataKey="y"
            nameKey="x"
            innerRadius={62}
            outerRadius={96}
            paddingAngle={2}
            stroke={chartTheme.surface}
          >
            {data.map((entry, index) => (
              <Cell key={entry.x} fill={palette[index]} />
            ))}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
