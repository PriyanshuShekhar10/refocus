/**
 * Local (per-user) session block colors. Stored in localStorage only;
 * never sent to the server, so each user's color choice only affects their own calendar.
 */

const STORAGE_KEY = "refocus_session_colors";

function getStorage(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function setStorage(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/** Get the user's local color for a session ("" = default, or preset light hex). */
export function getLocalSessionColor(sessionId: string): string | undefined {
  const map = getStorage();
  return map[sessionId];
}

/** Set the user's local color for a session. Use "" for default. */
export function setLocalSessionColor(sessionId: string, color: string): void {
  const map = getStorage();
  if (color) {
    map[sessionId] = color;
  } else {
    delete map[sessionId];
  }
  setStorage(map);
}
