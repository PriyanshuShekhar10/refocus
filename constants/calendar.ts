/**
 * Calendar Configuration Constants
 *
 * This file serves as the single source of truth for all calendar-related
 * configuration values. To add a new duration option, simply add it to
 * DURATION_OPTIONS array - all UI components and types will update automatically.
 */

// ============================================
// Duration Configuration
// ============================================

/**
 * Available session duration options in minutes.
 * Add new durations here - they will automatically appear in:
 * - Duration filter buttons
 * - Session creation options
 * - Type definitions
 */
export const DURATION_OPTIONS = [25, 50, 75] as const;

/**
 * Type derived from DURATION_OPTIONS for type safety.
 * This ensures only valid durations can be used throughout the app.
 */
export type DurationMin = (typeof DURATION_OPTIONS)[number];

/**
 * Default duration for new sessions
 */
export const DEFAULT_DURATION: DurationMin = 50;

/**
 * Default filter state (all durations selected)
 */
export const DEFAULT_DURATION_FILTER: DurationMin[] = [...DURATION_OPTIONS];

// ============================================
// Layout Configuration
// ============================================

/**
 * Booking start-time grid (wall clock). Sessions can start on :00 and :30 only.
 */
export const BOOKING_TIME_STEP_MINUTES = 30;

/** Minute-of-hour choices for booking UIs */
export const BOOKING_MINUTE_OPTIONS = [0, 30] as const;

/**
 * How far a session may extend past the calendar day boundary (into the next
 * morning), and how far a previous-night session may still occupy the start
 * of a day. Keeps late starts like 23:30 bookable for 25/50/75-minute sessions.
 */
export const BOOKING_DAY_OVERFLOW_MINUTES = 60;

export const CALENDAR_LAYOUT = {
  /** Height of each booking-step row in pixels (30-minute steps) */
  rowPx: 56,

  /** Height of each hour block (2 x rowPx for 30-min steps) */
  hourBlockHeight: 112,

  /** Width of the time gutter on the left */
  gutterWidth: 64,

  /** Y positions for :30 minute marker lines within an hour block */
  minorLinePositions: [56],
} as const;

// ============================================
// Time Configuration
// ============================================

export const TIME_CONFIG = {
  /**
   * Server-side only (emails / digests). Product UI must use
   * browser-local helpers from `@/lib/localTime` — never this field.
   */
  timezone: "Asia/Kolkata",

  /** Fallback locale when browser locale is unavailable (server) */
  locale: "en-IN",

  /** Time format options for grid hover labels (local clock, no forced TZ) */
  timeFormatOptions: {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  } as const,
} as const;

// ============================================
// Session Types Configuration
// ============================================

export const SESSION_TYPES = ["focus", "deep-work", "learning"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

// ============================================
// Session Status Configuration
// ============================================

export const SESSION_STATUSES = [
  "available",
  "booked",
  "in-progress",
  "completed",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a value is a valid duration
 */
export function isValidDuration(value: number): value is DurationMin {
  return DURATION_OPTIONS.includes(value as DurationMin);
}

/**
 * Get the next duration option (cycles through options)
 */
export function getNextDuration(current: DurationMin): DurationMin {
  const index = DURATION_OPTIONS.indexOf(current);
  const nextIndex = (index + 1) % DURATION_OPTIONS.length;
  return DURATION_OPTIONS[nextIndex];
}

/**
 * Convert minutes to pixels based on layout config
 */
export function minutesToPixels(
  minutes: number,
  stepMinutes: number = BOOKING_TIME_STEP_MINUTES,
): number {
  return (minutes / stepMinutes) * CALENDAR_LAYOUT.rowPx;
}

/**
 * Convert pixels to minutes based on layout config
 */
export function pixelsToMinutes(
  pixels: number,
  stepMinutes: number = BOOKING_TIME_STEP_MINUTES,
): number {
  return (pixels / CALENDAR_LAYOUT.rowPx) * stepMinutes;
}

/**
 * True when `date` falls on a BOOKING_TIME_STEP_MINUTES boundary
 * (UTC :00 / :30, which is wall :00 / :30 for hour and half-hour offsets).
 */
export function isBookingStartAligned(date: Date): boolean {
  if (date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) {
    return false;
  }
  return date.getTime() % (BOOKING_TIME_STEP_MINUTES * 60_000) === 0;
}

/**
 * Latest start (minutes from midnight on the booking day) that lands on the
 * booking step grid and whose end is within `dayEndMinutes + overflow`.
 * Starts themselves stay on the booking day (never past 23:30 for a 0–24 day).
 */
export function maxAlignedBookingStartMinutes(
  dayEndMinutes: number,
  durationMin: number,
  stepMinutes: number = BOOKING_TIME_STEP_MINUTES,
  overflowMinutes: number = BOOKING_DAY_OVERFLOW_MINUTES,
): number {
  const latestByEnd = dayEndMinutes + overflowMinutes - durationMin;
  const lastSlotOnDay = dayEndMinutes - stepMinutes;
  const latest = Math.min(latestByEnd, lastSlotOnDay);
  if (latest < 0) return 0;
  return Math.floor(latest / stepMinutes) * stepMinutes;
}

// ============================================
// Session Color Presets (theme-aware)
// ============================================

/**
 * Five preset colors for session blocks. Each has a light- and dark-mode variant
 * so blocks look good on both backgrounds. We store the light hex in the API;
 * the UI resolves to the correct variant based on current theme.
 */
export const SESSION_COLOR_PRESETS = [
  { light: "#e0e7ff", dark: "#3730a3" },   // indigo
  { light: "#dbeafe", dark: "#1e40af" },  // blue
  { light: "#d1fae5", dark: "#047857" },   // emerald
  { light: "#fef3c7", dark: "#b45309" },   // amber
  { light: "#fce7f3", dark: "#9d174d" },   // pink
] as const;

/**
 * Resolve stored session color to the theme-appropriate hex for display.
 * Stored value is always a preset's light hex (or legacy custom hex).
 */
export function getResolvedSessionColor(
  storedColor: string | null | undefined,
  isDark: boolean,
): string | null {
  if (!storedColor) return null;
  const preset = SESSION_COLOR_PRESETS.find(
    (p) => p.light === storedColor || p.dark === storedColor,
  );
  if (preset) return isDark ? preset.dark : preset.light;
  return storedColor;
}

/**
 * Index of the preset that matches the stored color, or -1 if none/custom.
 */
export function getSessionColorPresetIndex(
  storedColor: string | null | undefined,
): number {
  if (!storedColor) return -1;
  return SESSION_COLOR_PRESETS.findIndex(
    (p) => p.light === storedColor || p.dark === storedColor,
  );
}
