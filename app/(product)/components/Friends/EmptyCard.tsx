import { ReactNode } from "react";

interface EmptyCardProps {
  label: string;
  sub?: ReactNode;
}

export default function EmptyCard({ label, sub }: EmptyCardProps) {
  return (
    <div
      className="rounded-xl border border-dashed px-4 py-8 text-center"
      style={{
        borderColor: "var(--line)",
        background: "var(--line-soft)",
      }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
        {label}
      </p>
      {sub ? (
        <p className="mt-1 text-sm" style={{ color: "var(--ink-mute)" }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}
