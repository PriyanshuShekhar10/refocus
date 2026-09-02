/**
 * Blog niches for Refocus auto-publishing.
 * Scheduled cadence: Mon/Wed/Fri via blog-publish.yml (rotating niche).
 * Per-niche workflows remain for manual workflow_dispatch only.
 *
 * Each niche also declares a `pillar`: the cluster landing page every post in
 * that niche should link to once (topic-cluster model). The generator enforces
 * exactly one natural in-body link to this page, plus a commercial hub link
 * (/pricing, /free, or an alternatives page) when the topic is free/commercial.
 */

export const CATEGORIES = {
  productivity: {
    id: "productivity",
    label: "Productivity",
    pillar: {
      path: "/body-doubling",
      label: "body doubling",
    },
    audience:
      "people who want practical focus systems — deep work, time-boxing, starting, finishing — and often search for accountability or a 'focus room' setup",
    voice:
      "clear, concrete, no productivity-porn. Prefer tactics over theory. Name the exact problem in the first paragraph. Where natural, frame focus around accountability and working alongside someone (body doubling / focus rooms).",
    mustInclude:
      "at least one concrete routine, template, or numbered tactic the reader can try today",
    avoid: "vague pep talks, 'just be disciplined', invented statistics",
    topics: [
      "body doubling for productivity: working next to someone so you actually start",
      "how to build a personal 'focus room' at home for accountability",
      "how to start a 50-minute deep work block when you keep opening new tabs",
      "time-boxing your afternoon when meetings ate the morning",
      "why open-ended to-do lists stall you — and a 3-item replacement",
      "protecting the first focus hour after you wake up",
      "finishing one thing before starting three: a shutdown ritual",
      "Pomodoro vs longer blocks: when 25 minutes isn't enough",
      "planning tomorrow in 10 minutes so you don't renegotiate all morning",
      "recovering focus after a Slack rabbit hole",
      "batching shallow work so deep work has a real slot",
      "what to do in the first 5 minutes of a session when resistance is high",
      "free virtual coworking apps worth trying when paid memberships feel like overkill",
      "accountability partner ideas that aren't another Discord lobby",
    ],
  },

  adhd: {
    id: "adhd",
    label: "ADHD & mental health",
    pillar: {
      path: "/body-doubling",
      label: "body doubling for ADHD",
    },
    audience:
      "people with ADHD or ADHD-like focus struggles, anxiety around starting, and shame about 'just trying harder' — often searching for a body doubling tool or app",
    voice:
      "compassionate and practical. Never lecture. Acknowledge executive dysfunction, body doubling, and interest-based nervous systems. Not medical advice. Use the phrase 'body doubling' naturally when it fits.",
    mustInclude:
      "at least one body-doubling, external structure, or environment tactic that doesn't rely on willpower alone",
    avoid:
      "cure language, stigma, 'ADHD superpower' clichés, diagnosing the reader",
    topics: [
      "the best body doubling tool setup for ADHD that isn't just another app",
      "body doubling for ADHD: how to find a focus partner when you have none",
      "why 'just focus' fails ADHD brains — and what external structure actually helps",
      "body doubling for ADHD: why another person in the room changes the start",
      "task initiation paralysis: shrinking the first step until it's silly-small",
      "interest-based nervous systems: working with urgency without burning out",
      "shame after a wasted study day — and how to restart without a full reset",
      "timers as external working memory when your brain won't hold the plan",
      "transition trouble: ending one task and starting the next without melting down",
      "noise, silence, and ADHD: designing a focus environment that doesn't fight you",
      "accountability without pressure for ADHD study sessions",
      "when medication isn't enough: environmental scaffolding for focus",
      "free body doubling for ADHD without paying for a deep-work membership",
      "body doubling vs accountability partner apps: which helps task initiation",
    ],
  },

  exams: {
    id: "exams",
    label: "Study & focus",
    pillar: {
      path: "/study-with-me",
      label: "studying with me online",
    },
    audience:
      "students and lifelong learners anywhere — long study sessions, exam-season pressure, studying alone at home — often searching for study-with-me or online focus rooms. Global English; no country-specific exam names.",
    voice:
      "practical study-session design: revision blocks, mock review, syllabus overwhelm, staying on your own plan. Generic exam season OK; never name a specific national exam (no UPSC, NEET, UTBK, etc.).",
    mustInclude:
      "at least one concrete study-session tactic (timer, three targets, mock review structure) without naming a specific country's exam",
    avoid:
      "UPSC, NEET, CAT, GATE, JEE, boards, CUET, UTBK, SNBT, PNLE, THPT, or any country-specific exam names; rank guarantees; coaching ads; vague motivation",
    topics: [
      "study with me online: turning solo study into a focused daily routine",
      "online study rooms when you prep alone at home",
      "designing a daily revision block you can actually start",
      "mock test review: a session structure that does not waste the day",
      "when the syllabus feels infinite, pick today's three targets",
      "active recall sessions that beat passive rereading",
      "exam-season focus without burning out the night before",
      "library energy at home: quiet co-presence while you study",
      "GRE / IELTS / generic test prep: focus sessions that do not turn into phone scrolls",
      "free study-with-me options when YouTube ambient is not enough",
    ],
  },

  loneliness: {
    id: "loneliness",
    label: "Loneliness & studying alone",
    pillar: {
      path: "/virtual-coworking",
      label: "virtual coworking",
    },
    audience:
      "students and remote learners who feel isolated grinding alone — library energy without a library, missing silent company, drawn to virtual coworking / online study rooms",
    voice:
      "honest about loneliness without being bleak. Focus on quiet co-presence, not forced socializing. Body doubling, virtual coworking, and shared focus as the bridge.",
    mustInclude:
      "distinguish loneliness from needing a chat — quiet company vs conversation — and one way to get co-presence",
    avoid: "toxic positivity, 'just join a Discord', treating loneliness as a character flaw",
    topics: [
      "virtual coworking for people who study or work alone all day",
      "online coworking spaces vs Discord servers when you just want quiet company",
      "the loneliness of studying alone at home for months",
      "why coffee-shop focus works (and what to do when you can't go)",
      "silent co-studying vs study groups that become hangouts",
      "missing hostel / library energy after moving back home",
      "night-owl study sessions when everyone else is asleep",
      "feeling behind because you prep alone with no one to check in with",
      "accountability partners who don't want to talk — just show up",
      "virtual body doubling when your friends are in different cities",
      "the difference between needing company and needing a conversation",
      "building a weekly study ritual so solitude doesn't feel endless",
      "free online coworking when you can't afford a membership or cafe habit",
    ],
  },

  remote: {
    id: "remote",
    label: "Remote work & freelancing",
    pillar: {
      path: "/virtual-coworking",
      label: "virtual coworking",
    },
    audience:
      "remote workers, freelancers, and indie makers who miss office presence and struggle to start without external structure — often searching for virtual coworking or online coworking spaces",
    voice:
      "workplace-realistic. Calendar, clients, async chat, WFH distractions. Concrete session design for knowledge work. Where natural, frame the fix as virtual coworking / online coworking.",
    mustInclude:
      "a concrete WFH or freelance scenario (clients, async Slack, home distractions) and a session structure",
    avoid: "hustle culture, 'rise and grind', pretending remote is always freedom",
    topics: [
      "virtual coworking for remote workers who miss the office",
      "online coworking spaces for freelancers who work alone all day",
      "virtual coworking vs Zoom and Discord for actually getting focused",
      "WFH mornings that dissolve into email before any deep work",
      "freelancers: scoping a billable focus block when every hour feels interruptible",
      "missing desk neighbors — recreating quiet office energy alone",
      "async Slack culture and the myth of being always available",
      "shipping a side project after your day job without doomscrolling",
      "client calls that shatter the afternoon — reclaiming one solid block",
      "working from a one-room apartment without a real desk",
      "timezone loneliness on a distributed team",
      "makers and indie hackers: ending the day with something shipped",
      "when your roommate / family treats WFH like you're free all day",
      "free Focusmate-style sessions for freelancers who hit the weekly free-tier wall",
      "when paid deep-work clubs feel like overkill for one focused hour",
    ],
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES);

/** Commercial hub pages — generator may require one of these for free-angled topics. */
export const COMMERCIAL_HUBS = [
  { path: "/pricing", label: "Refocus pricing (free period)" },
  { path: "/free", label: "Refocus free period summary" },
  { path: "/focusmate-alternative", label: "Refocus vs Focusmate" },
  { path: "/flown-alternative", label: "Refocus vs FLOWN" },
  { path: "/cofocus-alternative", label: "Refocus vs Cofocus" },
];

/** Detect topics that should reinforce free / alternatives hubs. */
export function isFreeCommercialTopic(topic) {
  const t = String(topic || "").toLowerCase();
  return /\bfree\b|alternative|focusmate|membership|pricing|session cap|paid/.test(
    t,
  );
}

/** Legacy helper — niches now publish via blog-publish.yml Mon/Wed/Fri. */
export const CRON_HOUR_BY_CATEGORY = {
  productivity: 6,
  adhd: 9,
  exams: 12,
  loneliness: 15,
  remote: 18,
};

export function getCategory(id) {
  const key = String(id || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  const aliases = {
    "adhd-mental-health": "adhd",
    mental: "adhd",
    "mental-health": "adhd",
    "competitive-exams": "exams",
    exam: "exams",
    "competitive-exam": "exams",
    lonely: "loneliness",
    "remote-work": "remote",
    freelance: "remote",
    freelancing: "remote",
    general: "productivity",
    generic: "productivity",
  };
  const resolved = aliases[key] || key;
  return CATEGORIES[resolved] || null;
}

export function pickCategoryByUtcHour(date = new Date()) {
  const ids = CATEGORY_IDS;
  return ids[date.getUTCHours() % ids.length];
}
