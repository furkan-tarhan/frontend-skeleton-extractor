const SEGMENTS: Array<{ label: string; from: number; to: number }> = [
  { label: 'FN', from: 0, to: 0.07 },
  { label: 'MW', from: 0.07, to: 0.15 },
  { label: 'FT', from: 0.15, to: 0.38 },
  { label: 'WW', from: 0.38, to: 0.45 },
  { label: 'BS', from: 0.45, to: 1 },
];

export interface FloatBarProps {
  float: number;
}

export function FloatBar({ float }: FloatBarProps) {
  return (
    <div>
      <div className="relative flex h-2 overflow-hidden rounded-full">
        {SEGMENTS.map((segment) => (
          <div
            key={segment.label}
            className="h-full bg-surface-raised first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(segment.to - segment.from) * 100}%` }}
          />
        ))}
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-accent"
          style={{ left: `${Math.min(100, Math.max(0, float * 100))}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted">
        {SEGMENTS.map((segment) => (
          <span key={segment.label}>{segment.label}</span>
        ))}
      </div>
      <p className="mt-1 text-sm text-primary">Float: {float.toFixed(4)}</p>
    </div>
  );
}
