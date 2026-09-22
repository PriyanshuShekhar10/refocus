// Single source of truth for blog niche metadata used across the UI
// (listing, post header, category archives, sitemap). Keep the ids in sync
// with the `category` enum in src/content.config.ts and scripts/blog-categories.mjs.

/** Locales (id/fil/vi/de) only publish these five niches. */
export type LocaleCategoryId =
  | "productivity"
  | "adhd"
  | "exams"
  | "loneliness"
  | "remote";

/** English scheduled slots rotate these community niches. */
export type CommunityCategoryId =
  | "med-school"
  | "phd"
  | "engineers"
  | "parents"
  | "career-switch"
  | "writers"
  | "law"
  | "nurses"
  | "founders"
  | "teachers";

export type CategoryId = LocaleCategoryId | CommunityCategoryId;

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

export const LOCALE_CATEGORY_IDS: LocaleCategoryId[] = [
  "productivity",
  "adhd",
  "exams",
  "loneliness",
  "remote",
];

export const COMMUNITY_CATEGORY_IDS: CommunityCategoryId[] = [
  "med-school",
  "phd",
  "engineers",
  "parents",
  "career-switch",
  "writers",
  "law",
  "nurses",
  "founders",
  "teachers",
];

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
  "med-school": {
    id: "med-school",
    label: "Med school & residency",
    description:
      "Study and focus tactics for med students and junior doctors after long wards — Anki, night float, short windows.",
    intro:
      "Practical session design for people who already worked a 12-hour day: post-shift review, card minimums, and quiet co-study.",
    pillar: { path: "/study-with-me", label: "studying with me online" },
  },
  phd: {
    id: "phd",
    label: "PhD & dissertation",
    description:
      "Writing sprints, ABD isolation, and research session design for solo scholars.",
    intro:
      "Concrete structures for dissertation chapters, lit-review time-boxes, and virtual coworking when the shared office is gone.",
    pillar: { path: "/virtual-coworking", label: "virtual coworking" },
  },
  engineers: {
    id: "engineers",
    label: "Software engineers",
    description:
      "Maker time for software ICs — standups, PRs, Slack, and reclaiming deep work.",
    intro:
      "Engineering-realistic focus tactics: protecting calendar focus blocks, batching code review, and body doubling on hard tickets.",
    pillar: { path: "/body-doubling", label: "body doubling" },
  },
  parents: {
    id: "parents",
    label: "Working parents",
    description:
      "Deep work in nap windows, after-bedtime 90 minutes, and noisy homes.",
    intro:
      "Session designs sized for short parental windows — without perfect-morning fantasy or guilt.",
    pillar: { path: "/virtual-coworking", label: "virtual coworking" },
  },
  "career-switch": {
    id: "career-switch",
    label: "Career switchers",
    description:
      "Second-shift studying after a day job — bootcamps, certifications, portfolio work.",
    intro:
      "Evening and weekend study protocols for people learning a new path around full-time work.",
    pillar: { path: "/study-with-me", label: "studying with me online" },
  },
  writers: {
    id: "writers",
    label: "Writers & long-form",
    description:
      "Blank-page starts, drafting vs editing sprints, and quiet co-writing.",
    intro:
      "Craft-aware session design for long-form writers who stall alone at the desk.",
    pillar: { path: "/body-doubling", label: "body doubling" },
  },
  law: {
    id: "law",
    label: "Law school & articling",
    description:
      "Case briefing, outlining, and study blocks for law students — no country-specific bar brands.",
    intro:
      "Practical reading and outline sessions for long doctrinal loads and exhausted evenings.",
    pillar: { path: "/study-with-me", label: "studying with me online" },
  },
  nurses: {
    id: "nurses",
    label: "Nursing & shift work",
    description:
      "Post-shift study and CE for nurses on 12-hour and night rotations.",
    intro:
      "Shift-work-realistic focus tactics that respect sleep, recovery, and short windows.",
    pillar: { path: "/study-with-me", label: "studying with me online" },
  },
  founders: {
    id: "founders",
    label: "Founders & indie makers",
    description:
      "Build vs sales context-switching and solo-founder accountability.",
    intro:
      "Session design for indie makers who need maker time without another hustle club.",
    pillar: { path: "/virtual-coworking", label: "virtual coworking" },
  },
  teachers: {
    id: "teachers",
    label: "Teachers & educators",
    description:
      "Grading and lesson planning after a full school day.",
    intro:
      "Timed evening and weekend blocks for educators — with clear stop conditions.",
    pillar: { path: "/body-doubling", label: "body doubling" },
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
