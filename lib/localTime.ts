/**
 * Display time formatting for product UI.
 * Uses the active display timezone when set (user preference),
 * otherwise the browser's local timezone.
 * Backend sessions stay UTC; only display uses these helpers.
 */

import { isValidTimeZone } from "@/lib/zonedTime";

/** Preferred IANA zone, or undefined for browser-local. */
let activeDisplayTimeZone: string | undefined;

/**
 * Map legacy IANA aliases to the canonical id browsers typically report.
 * Node and browsers disagree on a few (e.g. Asia/Calcutta vs Asia/Kolkata),
 * which causes React hydration mismatches when the zone is rendered as text.
 */
const TIMEZONE_ALIASES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Europe/Kiev": "Europe/Kyiv",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "Pacific/Samoa": "Pacific/Pago_Pago",
};

export function canonicalizeTimeZone(timeZone: string): string {
  return TIMEZONE_ALIASES[timeZone] ?? timeZone;
}

export function setActiveDisplayTimeZone(
  timeZone: string | null | undefined,
): void {
  if (!timeZone || timeZone === "auto" || !isValidTimeZone(timeZone)) {
    activeDisplayTimeZone = undefined;
    return;
  }
  activeDisplayTimeZone = canonicalizeTimeZone(timeZone);
}

export function getActiveDisplayTimeZone(): string | undefined {
  return activeDisplayTimeZone;
}

export function getBrowserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    return canonicalizeTimeZone(tz);
  } catch {
    return "UTC";
  }
}

/** Effective zone for UI: preference if set, else browser. */
export function getDisplayTimeZone(): string {
  return activeDisplayTimeZone ?? getBrowserTimeZone();
}

function resolveLocale(locale?: string): string | undefined {
  if (locale) return locale;
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return undefined;
}

function withZone(
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
  const timeZone = options?.timeZone ?? activeDisplayTimeZone;
  if (!timeZone) return { ...options };
  return { ...options, timeZone };
}

export function formatLocalTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale?: string,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString(resolveLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    ...withZone(options),
  });
}

export function formatLocalDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale?: string,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(resolveLocale(locale), withZone(options));
}

export function formatLocalDateTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale?: string,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString(resolveLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    ...withZone(options),
  });
}

export function formatLocalTimeRange(
  start: Date | string | number,
  end: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale?: string,
): string {
  return `${formatLocalTime(start, options, locale)} – ${formatLocalTime(end, options, locale)}`;
}
