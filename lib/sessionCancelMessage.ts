export const SESSION_CANCEL_MESSAGE_MAX = 500;

/** Trim, cap, and drop empty notes. Newlines are kept. */
export function normalizeCancelMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const title = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!title) return null;
  return title.slice(0, SESSION_CANCEL_MESSAGE_MAX);
}
