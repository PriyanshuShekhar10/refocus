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
export const DURATION_OPTIONS = [25, 50, 75 ] as const;

/**
 * Type derived from DURATION_OPTIONS for type safety.
 * This ensures only valid durations can be used throughout the app.
 */
export type DurationMin = (typeof DURATION_OPTIONS)[number];

/**
 * Default duration for new sessions
 */
export const DEFAULT_DURATION: DurationMin = 25;

/**
 * Default filter state (all durations selected)
 */
export const DEFAULT_DURATION_FILTER: DurationMin[] = [...DURATION_OPTIONS];

// ============================================
// Layout Configuration
// ============================================

export const CALENDAR_LAYOUT = {
  /** Height of each 15-minute row in pixels */
  rowPx: 28,

  /** Height of each hour block (4 x rowPx for 15-min steps) */
  hourBlockHeight: 112,

  /** Width of the time gutter on the left */
  gutterWidth: 64,

  /** Y positions for 15/30/45 minute marker lines within an hour block */
  minorLinePositions: [28, 56, 84],
} as const;

// ============================================
// Time Configuration
// ============================================

export const TIME_CONFIG = {
  /** Default timezone for display */
  timezone: "Asia/Kolkata",

  /** Default locale for formatting */
  locale: "en-IN",

  /** Time format options for displaying time labels */
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
  stepMinutes: number = 15,
): number {
  return (minutes / stepMinutes) * CALENDAR_LAYOUT.rowPx;
}

/**
 * Convert pixels to minutes based on layout config
 */
export function pixelsToMinutes(
  pixels: number,
  stepMinutes: number = 15,
): number {
  return (pixels / CALENDAR_LAYOUT.rowPx) * stepMinutes;
}
