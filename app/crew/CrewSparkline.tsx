"use client";

import { useMemo } from "react";
import type { DayCounts, MetricKey } from "./crewShared";

export function CrewSparkline({
  days,
  metric,
}: {
  days: DayCounts[];
  metric: MetricKey;
}) {
  const values = days.map((d) => d[metric]);
  const max = Math.max(1, ...values);
  const w = 360;
  const h = 88;
  const padX = 8;
  const padY = 10;

  const points = useMemo(() => {
    return values
      .map((v, i) => {
        const x =
          values.length === 1
            ? w / 2
            : padX + (i / (values.length - 1)) * (w - padX * 2);
        const y = h - padY - (v / max) * (h - padY * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }, [values, max]);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-24 w-full text-neutral-800"
      role="img"
      aria-label={`${metric} over days`}
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
      />
      {values.map((v, i) => {
        const x =
          values.length === 1
            ? w / 2
            : padX + (i / (values.length - 1)) * (w - padX * 2);
        const y = h - padY - (v / max) * (h - padY * 2);
        return (
          <circle
            key={days[i]?.date ?? i}
            cx={x}
            cy={y}
            r="2.5"
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}
