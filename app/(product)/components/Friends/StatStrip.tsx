interface Stat {
  label: string;
  value: number | string;
  unit?: string;
}

export default function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-border bg-card px-4 py-3"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {s.label}
          </div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {s.value}
            {s.unit ? (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {s.unit}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
