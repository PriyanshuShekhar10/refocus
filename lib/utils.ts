import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const pad = (n: number) => String(n).padStart(2, "0");

export const toISO = (d: Date) => new Date(d).toISOString();

export const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addMinutes = (d: Date, m: number) =>
  new Date(d.getTime() + m * 60_000);

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const formatDayLabel = (d: Date, locale = "en-US") =>
  d.toLocaleDateString(locale, { weekday: "short", day: "numeric" });

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const clamp = (val: number, min: number, max: number) =>
  Math.min(max, Math.max(min, val));

export const minutesBetween = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / 60000);

// const snapMinutes = (m: number, step: number) => Math.round(m / step) * step;

export function formatHour(h24: number) {
  const h = ((h24 + 11) % 12) + 1;
  const suffix = h24 < 12 ? "AM" : "PM";
  return `${h} ${suffix}`;
}
