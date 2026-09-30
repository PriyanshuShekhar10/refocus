import { ReactNode } from "react";

interface EmptyCardProps {
  label: string;
  sub?: ReactNode;
}

export default function EmptyCard({ label, sub }: EmptyCardProps) {
  return (
    <div
      className="rounded-xl border border-dashed p-5 text-center"
      style={{ borderColor: "var(--line)" }}
    >
      <p className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>
        {label}
      </p>
      {sub ? (
        <p className="mt-1 text-xs" style={{ color: "var(--ink-mute)" }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}
