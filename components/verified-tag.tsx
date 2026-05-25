import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

type Props = {
  /** Extra-small for chat; small for calendar lists */
  size?: "xs" | "sm";
  className?: string;
};

export function VerifiedTag({ size = "sm", className = "" }: Props) {
  const isXs = size === "xs";
  return (
    <span
      title="Verified email"
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full font-semibold bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 ${
        isXs ? "px-1 py-0 text-[9px]" : "px-1.5 py-0.5 text-[10px]"
      } ${className}`}
    >
      <ShieldCheck
        size={isXs ? 9 : 11}
        strokeWidth={2.5}
        aria-hidden
        className="shrink-0"
      />
      <span>Verified</span>
    </span>
  );
}

type VerifiedNameProps = {
  name: ReactNode;
  verified?: boolean;
  className?: string;
  nameClassName?: string;
};

export function VerifiedName({
  name,
  verified,
  className = "",
  nameClassName = "",
}: VerifiedNameProps) {
  return (
    <span
      className={`inline-flex max-w-full min-w-0 items-center gap-1 ${className}`}
    >
      <span className={`truncate ${nameClassName}`}>{name}</span>
      {verified ? <VerifiedTag size="xs" /> : null}
    </span>
  );
}
