import {
  formatPublicAttendance,
  type PublicAttendance,
} from "@/lib/sessionAttendanceStats";

export function AttendanceHighlight({
  attendance,
  variant = "marketing",
}: {
  attendance: PublicAttendance;
  variant?: "marketing" | "app";
}) {
  const sessionNoun = attendance.attended === 1 ? "session" : "sessions";

  if (variant === "app") {
    return (
      <div className="grid w-full grid-cols-2 overflow-hidden rounded-lg border border-rf-rose/20 bg-[#CA5995]/[0.07] dark:bg-[#CA5995]/10">
        <div className="px-2.5 py-1.5">
          <p className="text-[15px] font-semibold tabular-nums leading-none text-rf-plum-ink">
            {attendance.percent}%
          </p>
          <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.14em] text-rf-ink-mute">
            attendance
          </p>
        </div>
        <div className="border-l border-rf-rose/20 px-2.5 py-1.5">
          <p className="text-[15px] font-semibold tabular-nums leading-none text-rf-ink">
            {attendance.attended}
          </p>
          <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.14em] text-rf-ink-mute">
            {sessionNoun}
          </p>
        </div>
      </div>
    );
  }

  return (
    <span
      role="group"
      aria-label={formatPublicAttendance(attendance)}
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        overflow: "hidden",
        borderRadius: 12,
        border: "1px solid color-mix(in oklab, var(--accent) 35%, var(--line))",
        background: "var(--accent-soft)",
      }}
    >
      <span style={{ padding: "7px 12px" }}>
        <span
          style={{
            display: "block",
            fontSize: 16,
            fontWeight: 600,
            lineHeight: 1,
            color: "var(--ink)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {attendance.percent}%
        </span>
        <span
          style={{
            display: "block",
            marginTop: 4,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          attendance
        </span>
      </span>
      <span
        style={{
          padding: "7px 12px",
          borderLeft:
            "1px solid color-mix(in oklab, var(--accent) 30%, var(--line))",
        }}
      >
        <span
          style={{
            display: "block",
            fontSize: 16,
            fontWeight: 600,
            lineHeight: 1,
            color: "var(--ink)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {attendance.attended}
        </span>
        <span
          style={{
            display: "block",
            marginTop: 4,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          {sessionNoun}
        </span>
      </span>
    </span>
  );
}
