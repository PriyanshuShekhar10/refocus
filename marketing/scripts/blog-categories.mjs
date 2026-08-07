/**
 * Blog niches for Refocus auto-publishing.
 * Each category has its own hourly cron (staggered) and a concrete topic pool
 * so posts stay specific — exams, ADHD, loneliness, etc. — not vague advice.
 */

export const CATEGORIES = {
  productivity: {
    id: "productivity",
    label: "Productivity",
    audience:
      "people who want practical focus systems — deep work, time-boxing, starting, finishing",
    voice:
      "clear, concrete, no productivity-porn. Prefer tactics over theory. Name the exact problem in the first paragraph.",
    mustInclude:
      "at least one concrete routine, template, or numbered tactic the reader can try today",
    avoid: "vague pep talks, 'just be disciplined', invented statistics",
    topics: [
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
    ],
  },

  adhd: {
    id: "adhd",
    label: "ADHD & mental health",
    audience:
      "people with ADHD or ADHD-like focus struggles, anxiety around starting, and shame about 'just trying harder'",
    voice:
      "compassionate and practical. Never lecture. Acknowledge executive dysfunction, body doubling, and interest-based nervous systems. Not medical advice.",
    mustInclude:
      "at least one body-doubling, external structure, or environment tactic that doesn't rely on willpower alone",
    avoid:
      "cure language, stigma, 'ADHD superpower' clichés, diagnosing the reader",
    topics: [
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
    ],
  },

  exams: {
    id: "exams",
    label: "Competitive exams",
    audience:
      "aspirants preparing for UPSC, JEE, NEET, CAT, GATE, CA, CUET, board exams, GRE/GMAT — long lonely prep cycles",
    voice:
      "specific to exam prep life: revision, mocks, syllabus anxiety, peer comparison. Name real exams when relevant. Practical study-session design.",
    mustInclude:
      "name at least one real exam context (e.g. UPSC, JEE Main, NEET, CAT, GATE, CA Intermediate, Class 12 boards) and a concrete study-session tactic",
    avoid:
      "generic 'study hard' advice, rank/guarantee promises, coaching ads, vague motivation",
    topics: [
      "UPSC prelims: designing a daily revision block you can actually start",
      "JEE / NEET: surviving a full mock without spiraling after a bad score",
      "CAT quant practice: short timed sets vs endless untimed grinding",
      "GATE prep loneliness: studying at home when your friends aren't on the same timeline",
      "CA Intermediate: protecting evening study hours after a long day of classes",
      "Class 12 boards: last 60 days without burning out the night before",
      "CUET / university entrance: when syllabus feels infinite, pick today's three targets",
      "GRE / GMAT verbal: focus sessions that don't turn into phone scrolls",
      "comparing yourself to toppers on Telegram — and getting back to your own plan",
      "optional subject deep work for UPSC: one topic, one timer, one outcome",
      "NEET biology revision: active recall sessions that beat passive rereading",
      "JEE physics problem sets: batching hard problems into a focused hour",
    ],
  },

  loneliness: {
    id: "loneliness",
    label: "Loneliness & studying alone",
    audience:
      "students and remote learners who feel isolated grinding alone — library energy without a library, missing silent company",
    voice:
      "honest about loneliness without being bleak. Focus on quiet co-presence, not forced socializing. Body doubling and shared focus as the bridge.",
    mustInclude:
      "distinguish loneliness from needing a chat — quiet company vs conversation — and one way to get co-presence",
    avoid: "toxic positivity, 'just join a Discord', treating loneliness as a character flaw",
    topics: [
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
    ],
  },

  remote: {
    id: "remote",
    label: "Remote work & freelancing",
    audience:
      "remote workers, freelancers, and indie makers who miss office presence and struggle to start without external structure",
    voice:
      "workplace-realistic. Calendar, clients, async chat, WFH distractions. Concrete session design for knowledge work.",
    mustInclude:
      "a concrete WFH or freelance scenario (clients, async Slack, home distractions) and a session structure",
    avoid: "hustle culture, 'rise and grind', pretending remote is always freedom",
    topics: [
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
    ],
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES);

/** Stagger minutes so niche crons don't fight over the same git push. */
export const CRON_MINUTE_BY_CATEGORY = {
  productivity: 0,
  adhd: 12,
  exams: 24,
  loneliness: 36,
  remote: 48,
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
