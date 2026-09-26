type NameParts = {
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
  username?: string | null;
};

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function firstGrapheme(value: string) {
  const chars = [...value];
  return chars[0] ?? "";
}

/**
 * Push copy uses abbreviated surnames: "Priyanshu Sharma" → "Priyanshu S.".
 */
export function formatPushName(person: NameParts | null | undefined, fallback = "Someone") {
  if (!person) return fallback;

  const first = clean(person.firstname);
  const last = clean(person.lastname);
  if (first && last) {
    const initial = firstGrapheme(last);
    return initial ? `${first} ${initial.toUpperCase()}.` : first;
  }

  const full = clean(person.name);
  if (full) {
    const parts = full.replace(/\s+/g, " ").split(" ");
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1]!;
      const initial = firstGrapheme(lastPart);
      if (initial) {
        return `${parts.slice(0, -1).join(" ")} ${initial.toUpperCase()}.`;
      }
    }
    return full;
  }

  return clean(person.username) || fallback;
}

export function truncatePushBody(text: string, max = 120) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function formatPushStartTime(start: Date | string, timeZone = "Asia/Kolkata") {
  const date = new Date(start);
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
}
