import { ReactNode } from "react";

interface EmptyCardProps {
  label: string;
  sub?: ReactNode;
}

export default function EmptyCard({ label, sub }: EmptyCardProps) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {sub ? (
        <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}
