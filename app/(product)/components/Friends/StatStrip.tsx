import { designStyles } from "@/components/design";

interface Stat {
  label: string;
  value: number | string;
  unit?: string;
}

export default function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className={designStyles.card} style={{ padding: "14px 18px" }}>
          <div
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--ink-mute)" }}
          >
            {s.label}
          </div>
          <div
            className="mt-1 text-2xl font-semibold"
            style={{ color: "var(--ink)" }}
          >
            {s.value}
            {s.unit ? (
              <span
                className="ml-1 text-sm font-normal"
                style={{ color: "var(--ink-mute)" }}
              >
                {s.unit}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
