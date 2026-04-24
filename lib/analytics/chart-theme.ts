const SERIES = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'color-mix(in oklch, var(--primary) 65%, white)',
] as const;

export const chartTheme = Object.freeze({
  surface: 'var(--card)',
  surfaceMuted: 'color-mix(in oklch, var(--muted) 75%, var(--card))',
  text: 'var(--foreground)',
  textMuted: 'var(--muted-foreground)',
  gridStroke: 'color-mix(in oklch, var(--border) 80%, transparent)',
  axisStroke: 'color-mix(in oklch, var(--foreground) 18%, transparent)',
  tooltipSurface: 'color-mix(in oklch, var(--card) 92%, white)',
  tooltipBorder: 'var(--border)',
  fonts: {
    value: 'var(--font-serif)',
    eyebrow: 'var(--font-mono)',
  },
  seriesA: SERIES[0],
  seriesB: SERIES[1],
  seriesC: SERIES[2],
  seriesD: SERIES[3],
  seriesE: SERIES[4],
  seriesF: SERIES[5],
});

export function getSeriesPalette(count: number): string[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => SERIES[index % SERIES.length]);
}
