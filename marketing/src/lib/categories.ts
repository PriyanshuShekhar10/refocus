// Single source of truth for blog niche metadata used across the UI
// (listing, post header, category archives, sitemap). Keep the ids in sync
// with the `category` enum in src/content.config.ts and scripts/blog-categories.mjs.

export type CategoryId =
  | "productivity"
  | "adhd"
  | "exams"
  | "loneliness"
  | "remote";

export type CategoryMeta = {
  id: CategoryId;
  label: string;
  /** Short meta description for the archive page. */
  description: string;
  /** Longer intro paragraph shown at the top of the archive. */
  intro: string;
  /** Cluster pillar/landing page this niche feeds into (topic-cluster model). */
  pillar: { path: string; label: string };
};

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  productivity: {
    id: "productivity",
    label: "Productivity",
    description:
      "Practical focus systems — deep work, time-boxing, starting, and finishing — without the productivity-porn.",
    intro:
      "Concrete tactics for deep work and getting started: time-boxing, shutdown rituals, and beating the blank-page resistance.",
    pillar: { path: "/body-doubling", label: "body doubling" },
  },
  adhd: {
    id: "adhd",
    label: "ADHD & mental health",
    description:
      "Focus strategies that work with an ADHD brain — external structure, body doubling, and starting without shame.",
    intro:
      "Compassionate, practical notes on executive dysfunction, task initiation, and building focus scaffolding that doesn't rely on willpower.",
    pillar: { path: "/body-doubling", label: "body doubling for ADHD" },
  },
  exams: {
    id: "exams",
    label: "Study & focus",
    description:
      "Study-session design for long prep — revision blocks, mock review, studying alone — global, no country-specific exams.",
    intro:
      "Concrete tactics for focus sessions, active recall, and staying on your own plan.",
    pillar: { path: "/study-with-me", label: "studying with me online" },
  },
  loneliness: {
    id: "loneliness",
    label: "Loneliness & studying alone",
    description:
      "Honest notes on the isolation of studying alone — and how quiet co-presence can bridge it.",
    intro:
      "For anyone grinding alone at home: the difference between needing company and needing conversation, and how to get silent co-focus.",
    pillar: { path: "/study-partner", label: "quiet study partner" },
  },
  remote: {
    id: "remote",
    label: "Remote work & freelancing",
    description:
      "Session design for remote workers, freelancers, and makers who miss office presence and external structure.",
    intro:
      "Realistic focus tactics for WFH life: protecting a deep-work block around calls, clients, async Slack, and home distractions.",
    pillar: { path: "/virtual-coworking", label: "virtual coworking" },
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

const DEFAULT: CategoryId = "productivity";

export function categoryLabel(id?: string): string {
  return (
    (id && CATEGORIES[id as CategoryId]?.label) || CATEGORIES[DEFAULT].label
  );
}

export function categoryMeta(id?: string): CategoryMeta {
  return (id && CATEGORIES[id as CategoryId]) || CATEGORIES[DEFAULT];
}
