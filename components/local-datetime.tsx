"use client";

import { useEffect, useState } from "react";
import {
  formatLocalDate,
  formatLocalDateTime,
  formatLocalTime,
} from "@/lib/localTime";

type Props = {
  value: Date | string | number;
  mode?: "time" | "date" | "datetime";
  options?: Intl.DateTimeFormatOptions;
  className?: string;
  fallback?: string;
};

/**
 * Formats an instant in the browser's local timezone after mount,
 * avoiding SSR/hydration mismatches with the server clock.
 */
export function LocalDateTime({
  value,
  mode = "datetime",
  options,
  className,
  fallback = "…",
}: Props) {
  const [text, setText] = useState<string | null>(null);
  const optionsKey = options ? JSON.stringify(options) : "";

  useEffect(() => {
    const opts = optionsKey
      ? (JSON.parse(optionsKey) as Intl.DateTimeFormatOptions)
      : undefined;
    if (mode === "time") setText(formatLocalTime(value, opts));
    else if (mode === "date") setText(formatLocalDate(value, opts));
    else setText(formatLocalDateTime(value, opts));
  }, [value, mode, optionsKey]);

  return (
    <span className={className} suppressHydrationWarning>
      {text ?? fallback}
    </span>
  );
}
