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
