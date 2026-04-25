import { cn } from '@/lib/utils';

const DEFAULT_WIDTH = 120;
const DEFAULT_HEIGHT = 28;

export function sparklinePathD(series: number[], width: number, height: number): string {
  if (series.length === 0) return '';
  if (series.length === 1) {
    const y = height / 2;
    return `M 0 ${y.toFixed(2)} L ${width.toFixed(2)} ${y.toFixed(2)}`;
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min;
  const denomX = series.length - 1;

  const points = series.map((value, index) => {
    const x = (index / denomX) * width;
    const y = span === 0 ? height / 2 : height - ((value - min) / span) * height;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const;
  });

  const commands = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  return commands.join(' ');
}

type SparklineProps = {
  series: number[];
  width?: number;
  height?: number;
  className?: string;
};

export function Sparkline({
  series,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className,
}: SparklineProps) {
  const d = sparklinePathD(series, width, height);
  const gradientId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`;
  const empty = series.length === 0;

  return (
    <svg
      className={cn('block', className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-hidden="true"
    >
      {!empty && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d={`${d} L ${width} ${height} L 0 ${height} Z`}
            fill={`url(#${gradientId})`}
          />
          <path
            d={d}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
