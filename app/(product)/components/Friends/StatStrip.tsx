import { designStyles } from "@/components/design";

interface Stat {
  label: string;
  value: number | string;
  unit?: string;
  /** Shows a red dot next to the value (e.g. pending requests). */
  flag?: boolean;
}

/** Three-up stat row that sits along the bottom of the Friends header card. */
export default function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div
      className="mt-[22px] grid grid-cols-3"
      style={{ borderTop: "1px solid var(--line)" }}
    >
      {stats.map((s) => (
        <div key={s.label} style={{ padding: "14px 16px 0 0" }}>
          <div
            className={designStyles.mono}
            style={{
              fontSize: 10.5,
              color: "var(--ink-mute)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {s.label}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={designStyles.mono}
              style={{ fontSize: 24, letterSpacing: "-0.02em", color: "var(--ink)" }}
            >
              {s.value}
              {s.unit ? (
                <span style={{ fontSize: 12, color: "var(--ink-mute)", marginLeft: 3 }}>
                  {s.unit}
                </span>
              ) : null}
            </span>
            {s.flag ? (
              <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-red-500" />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
