/** Valid @mention username handle (matches profile username rules). */
export const MENTION_USERNAME_RE = /[a-z0-9_-]{3,20}/;

export type MentionPart =
  | { type: "text"; text: string }
  | { type: "mention"; label: string };

export type ParsedMention = {
  label: string;
  start: number;
  end: number;
};

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function userDisplayName(user: {
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
  username?: string | null;
}): string {
  const full = [user.firstname, user.lastname].filter(Boolean).join(" ").trim();
  return full || user.name?.trim() || user.username || "User";
}

const MENTION_NAME_WORD_RE = /[A-Za-z0-9_][A-Za-z0-9_.'-]*/;
const MAX_NAME_WORDS = 2;
const MENTION_STOPWORDS = new Set(["and", "or", "the", "a", "an"]);

function readMentionEnd(rest: string): number {
  const endCandidates = [rest.length];
  const comma = rest.search(/[\n,!?;:—]/);
  if (comma !== -1) endCandidates.push(comma);
  const sentenceDot = rest.search(/\.(\s|$|[,!?\s])/);
  if (sentenceDot !== -1) endCandidates.push(sentenceDot);
  const nextMention = rest.search(/\s@/);
  if (nextMention !== -1) endCandidates.push(nextMention);
  return Math.min(...endCandidates);
}

function isUsernameToken(token: string): boolean {
  return /^[a-z0-9_-]{3,20}$/i.test(token);
}

function labelFromMentionRaw(raw: string): { label: string; consumed: number } | null {
  const trimmed = raw.trimStart();
  const leadingSpace = raw.length - trimmed.length;
  if (!trimmed) return null;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  if (words.length > 1 && isUsernameToken(words[0])) {
    const tail = words.slice(1);
    if (tail.every((word) => MENTION_STOPWORDS.has(word.toLowerCase()))) {
      return {
        label: words[0].toLowerCase(),
        consumed: leadingSpace + words[0].length,
      };
    }
  }

  if (words.length >= 2) {
    const nameWords = words.slice(0, MAX_NAME_WORDS);
    const label = nameWords.join(" ");
    if (
      label.length >= 2 &&
      nameWords.every((word) => MENTION_NAME_WORD_RE.test(word))
    ) {
      const consumed = leadingSpace + trimmed.indexOf(label) + label.length;
      return { label, consumed };
    }
  }

  if (words.length === 1 && isUsernameToken(words[0])) {
    return {
      label: words[0].toLowerCase(),
      consumed: leadingSpace + words[0].length,
    };
  }

  return null;
}

/** Parse @mentions from stored content (username or display name). */
export function parseMentions(content: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  let i = 0;

  while (i < content.length) {
    if (content[i] !== "@") {
      i++;
      continue;
    }

    const start = i;
    i++;

    if (content[i] === '"') {
      const endQuote = content.indexOf('"', i + 1);
      if (endQuote !== -1) {
        const label = content.slice(i + 1, endQuote).trim();
        if (label) mentions.push({ label, start, end: endQuote + 1 });
        i = endQuote + 1;
        continue;
      }
    }

    const rest = content.slice(i);
    const endOffset = readMentionEnd(rest);
    const raw = rest.slice(0, endOffset);
    const parsed = labelFromMentionRaw(raw);
    if (parsed) {
      mentions.push({ label: parsed.label, start, end: i + parsed.consumed });
      i += parsed.consumed;
      continue;
    }

    i = start + 1;
  }

  return mentions;
}

export function parseMentionLabels(content: string): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const mention of parseMentions(content)) {
    const key = mention.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(mention.label);
  }
  return labels;
}

/** Username-only labels (lowercased) from parsed mentions. */
export function parseMentionUsernames(content: string): string[] {
  return parseMentionLabels(content)
    .filter((label) => /^[a-z0-9_-]{3,20}$/i.test(label))
    .map((label) => label.toLowerCase());
}

export function splitMentionContent(content: string): MentionPart[] {
  const mentions = parseMentions(content);
  if (mentions.length === 0) {
    return [{ type: "text", text: content }];
  }

  const parts: MentionPart[] = [];
  let lastIndex = 0;
  for (const mention of mentions) {
    if (mention.start > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, mention.start) });
    }
    parts.push({ type: "mention", label: mention.label });
    lastIndex = mention.end;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", text: content.slice(lastIndex) });
  }
  return parts;
}

export function formatMentionLabel(name: string): string {
  return name.trim();
}
