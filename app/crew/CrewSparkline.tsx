"use client";

import { useMemo } from "react";
import {
  CREW_METRICS,
  CREW_METRIC_COLORS,
  type DayCounts,
  type MetricKey,
} from "./crewShared";

function shortAxisDate(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return ymd;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${Number(match[3])} ${months[Number(match[2]) - 1]}`;
}

function xAt(
  i: number,
  n: number,
  plotLeft: number,
  plotWidth: number,
): number {
  if (n <= 1) return plotLeft + plotWidth / 2;
  return plotLeft + (i / (n - 1)) * plotWidth;
}

function yAt(
  v: number,
  max: number,
  plotTop: number,
  plotHeight: number,
): number {
  return plotTop + plotHeight - (v / max) * plotHeight;
}

export function CrewSparkline({
  days,
  visibleMetrics = CREW_METRICS.map((m) => m.key),
  selectedFrom,
  selectedTo,
  onSelectDate,
}: {
  days: DayCounts[];
  /** Metrics to draw; omit / empty → all metrics. */
  visibleMetrics?: MetricKey[];
  selectedFrom?: string | null;
  selectedTo?: string | null;
  onSelectDate?: (date: string) => void;
}) {
  const metrics =
    visibleMetrics.length > 0
      ? visibleMetrics
      : CREW_METRICS.map((m) => m.key);

  const w = 420;
  const h = 160;
  const padLeft = 36;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 28;
  const plotLeft = padLeft;
  const plotTop = padTop;
  const plotWidth = w - padLeft - padRight;
  const plotHeight = h - padTop - padBottom;

  const max = useMemo(() => {
    let m = 1;
    for (const day of days) {
      for (const key of metrics) {
        if (day[key] > m) m = day[key];
      }
    }
    return m;
  }, [days, metrics]);

  const yTicks = useMemo(() => {
    if (max <= 1) return [0, 1];
    if (max === 2) return [0, 1, 2];
    const mid = Math.round(max / 2);
    return [0, mid, max].filter((v, i, arr) => arr.indexOf(v) === i);
  }, [max]);

  const xLabelIndexes = useMemo(() => {
    const n = days.length;
    if (n <= 1) return [0];
    if (n <= 4) return Array.from({ length: n }, (_, i) => i);
    if (n <= 8) return [0, Math.floor((n - 1) / 2), n - 1];
    return [
      0,
      Math.floor((n - 1) / 3),
      Math.floor((2 * (n - 1)) / 3),
      n - 1,
    ];
  }, [days.length]);

  const series = useMemo(
    () =>
      metrics.map((key) => ({
        key,
        color: CREW_METRIC_COLORS[key],
        values: days.map((d) => d[key]),
      })),
    [days, metrics],
  );

  const rangeBounds = useMemo(() => {
    if (!selectedFrom || !selectedTo || days.length === 0) return null;
    const from = selectedFrom <= selectedTo ? selectedFrom : selectedTo;
    const to = selectedFrom <= selectedTo ? selectedTo : selectedFrom;
    let start = -1;
    let end = -1;
    for (let i = 0; i < days.length; i++) {
      const d = days[i].date;
      if (d >= from && d <= to) {
        if (start === -1) start = i;
        end = i;
      }
    }
    if (start === -1) return null;
    return { start, end };
  }, [days, selectedFrom, selectedTo]);

  if (days.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-44 w-full"
      role="img"
      aria-label="Session metrics over days"
    >
      {/* Plot frame */}
      <line
        x1={plotLeft}
        y1={plotTop}
        x2={plotLeft}
        y2={plotTop + plotHeight}
        stroke="#e5e5e5"
        strokeWidth="1"
      />
      <line
        x1={plotLeft}
        y1={plotTop + plotHeight}
        x2={plotLeft + plotWidth}
        y2={plotTop + plotHeight}
        stroke="#e5e5e5"
        strokeWidth="1"
      />

      {/* Y grid + labels */}
      {yTicks.map((tick) => {
        const y = yAt(tick, max, plotTop, plotHeight);
        return (
          <g key={`y-${tick}`}>
            <line
              x1={plotLeft}
              y1={y}
              x2={plotLeft + plotWidth}
              y2={y}
              stroke="#f5f5f5"
              strokeWidth="1"
            />
            <text
              x={plotLeft - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-neutral-400"
              style={{ fontSize: 9 }}
            >
              {tick}
            </text>
          </g>
        );
      })}

      {/* Selected range band */}
      {rangeBounds ? (
        <rect
          x={xAt(rangeBounds.start, days.length, plotLeft, plotWidth) - 4}
          y={plotTop}
          width={
            Math.max(
              8,
              xAt(rangeBounds.end, days.length, plotLeft, plotWidth) -
                xAt(rangeBounds.start, days.length, plotLeft, plotWidth),
            ) + 8
          }
          height={plotHeight}
          fill="#e5e5e5"
          opacity="0.45"
        />
      ) : null}

      {/* Series */}
      {series.map((s) => {
        const points = s.values
          .map((v, i) => {
            const x = xAt(i, days.length, plotLeft, plotWidth);
            const y = yAt(v, max, plotTop, plotHeight);
            return `${x},${y}`;
          })
          .join(" ");
        return (
          <g key={s.key}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={points}
            />
            {s.values.map((v, i) => {
              const inRange =
                rangeBounds != null &&
                i >= rangeBounds.start &&
                i <= rangeBounds.end;
              return (
                <circle
                  key={`${s.key}-${days[i]?.date ?? i}`}
                  cx={xAt(i, days.length, plotLeft, plotWidth)}
                  cy={yAt(v, max, plotTop, plotHeight)}
                  r={inRange ? 3.5 : 2.5}
                  fill={s.color}
                />
              );
            })}
          </g>
        );
      })}

      {/* X labels */}
      {xLabelIndexes.map((i) => {
        const day = days[i];
        if (!day) return null;
        return (
          <text
            key={`x-${day.date}`}
            x={xAt(i, days.length, plotLeft, plotWidth)}
            y={h - 8}
            textAnchor="middle"
            className="fill-neutral-400"
            style={{ fontSize: 9 }}
          >
            {shortAxisDate(day.date)}
          </text>
        );
      })}

      {/* Clickable day columns */}
      {onSelectDate
        ? days.map((day, i) => {
            const x = xAt(i, days.length, plotLeft, plotWidth);
            const colW =
              days.length <= 1 ? plotWidth : plotWidth / (days.length - 1);
            return (
              <rect
                key={`hit-${day.date}`}
                x={x - colW / 2}
                y={plotTop}
                width={Math.max(colW, 8)}
                height={plotHeight}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onSelectDate(day.date)}
              >
                <title>
                  {shortAxisDate(day.date)}
                  {CREW_METRICS.map(
                    (m) => `\n${m.label}: ${day[m.key]}`,
                  ).join("")}
                </title>
              </rect>
            );
          })
        : null}
    </svg>
  );
}
