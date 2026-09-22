/**
 * Blog niches for Refocus auto-publishing.
 *
 * English scheduled slots rotate the ten *community* niches
 * (med-school … teachers). Locale / German jobs and legacy manual
 * workflows keep the original five (productivity … remote).
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

  "med-school": {
    id: "med-school",
    label: "Med school & residency",
    pillar: {
      path: "/study-with-me",
      label: "studying with me online",
    },
    audience:
      "med students and junior doctors juggling wards, clinics, Anki, and exams — exhausted after long shifts but still needing a focused study block",
    voice:
      "hospital-realistic and compassionate. Name the shift fatigue, short windows, and guilt. Not medical advice; never diagnose. Practical session design for people who already worked a 12-hour day.",
    mustInclude:
      "at least one concrete post-shift or between-clinic study protocol (timer, card count, or shutdown ritual) that respects sleep",
    avoid:
      "medical advice, diagnosing readers, ranking hospitals, country-specific licensing exam names, 'just push harder', hero culture",
    topics: [
      "studying after a 12-hour ward day without wrecking sleep",
      "Anki when you are too tired to open the deck — a 20-card minimum that still counts",
      "night float recovery: protecting one focused study block before the next call",
      "pre-clinical vs clinical years: redesigning focus when the day stops being lectures",
      "library energy in a call room or hospital lounge",
      "when residents study alone at 2 a.m. — quiet co-presence that is not another group chat",
      "batching short recall sessions between clinics instead of one mythical free afternoon",
      "shame after falling behind on cards — restarting without a full reset",
      "study with me after hospital shifts when friends are already asleep",
      "protecting a morning review block before rounds start",
      "transition from wards to desk: a five-minute warm-up that beats doomscrolling",
      "free online study rooms for med students who cannot afford another subscription",
      "body doubling for Step-style prep without naming a specific board exam",
      "finishing one systems block before starting three more resources",
    ],
  },

  phd: {
    id: "phd",
    label: "PhD & dissertation",
    pillar: {
      path: "/virtual-coworking",
      label: "virtual coworking",
    },
    audience:
      "PhD students and ABD researchers stuck in isolation — writing sprints, advisor feedback paralysis, and days that dissolve into email and lit reviews",
    voice:
      "honest about loneliness and impostor feelings without melodrama. Academic-realistic: chapters, revisions, lab vs writing days. Prefer sessions over inspiration.",
    mustInclude:
      "at least one concrete writing or research session structure (word target, time box, or shutdown) for solo scholars",
    avoid:
      "hustle culture, 'publish or perish' scare tactics, pretending every day is deep work, naming specific funding bodies as ads",
    topics: [
      "dissertation writing sprints when the blank chapter page wins every morning",
      "ABD isolation: recreating lab energy when you work from home alone",
      "advisor feedback paralysis — starting the next draft without rereading forever",
      "protecting a writing block around teaching and admin",
      "lit review days that never end — time-boxing search vs synthesis",
      "virtual coworking for PhD students who miss the shared office",
      "when your cohort is ahead — staying on your own chapter plan",
      "lab work mornings and writing afternoons: switching modes without melting down",
      "finishing one analysis before opening twelve browser tabs of new papers",
      "accountability without another Discord full of venting",
      "weekend writing sessions that do not steal all recovery",
      "free online coworking when campus offices are closed or far",
      "body doubling for thesis writing when your partner is not academic",
      "planning tomorrow's research in 10 minutes so you do not renegotiate all morning",
    ],
  },

  engineers: {
    id: "engineers",
    label: "Software engineers",
    pillar: {
      path: "/body-doubling",
      label: "body doubling",
    },
    audience:
      "software ICs who lose maker time to standups, PRs, Slack, and meetings — not generic WFH freelancers",
    voice:
      "engineering-realistic. Standups, code review, incident noise, focus time on the calendar that gets stolen. Concrete, no productivity-porn.",
    mustInclude:
      "a concrete IC scenario (PR queue, Slack, standup cluster) and a session structure that protects maker time",
    avoid:
      "generic remote-work platitudes, founder/CEO framing, hustle slogans, '10x engineer' language",
    topics: [
      "protecting maker time when standups and syncs eat the morning",
      "shipping a PR without living in Slack all afternoon",
      "deep work after on-call: reclaiming one solid block",
      "code review batching so context switching does not kill focus",
      "calendar focus blocks that teammates treat as optional",
      "body doubling for engineers who work alone and stall on hard tickets",
      "afternoon energy crash after too many Zoom standups",
      "finishing one ticket before opening three new half-done branches",
      "quiet co-working when the open office or home desk is chaos",
      "when async Slack culture still expects instant replies",
      "planning tomorrow's engineering work in 10 minutes",
      "side-project evenings after a full IC day without doomscrolling",
      "free Focusmate-style sessions when you hit weekly free-tier walls",
      "recovering focus after a Slack rabbit hole between PRs",
    ],
  },

  parents: {
    id: "parents",
    label: "Working parents",
    pillar: {
      path: "/virtual-coworking",
      label: "virtual coworking",
    },
    audience:
      "working parents squeezing focus into nap windows, after-bedtime 90 minutes, and noisy homes with a toddler next door",
    voice:
      "practical and kind. Acknowledge interrupted days without guilt lectures. Short windows, imperfect environments, realistic targets.",
    mustInclude:
      "at least one session design sized for a short parental window (nap, after bedtime, early morning) with a clear start ritual",
    avoid:
      "perfect morning-routine fantasy, shaming working parents, pretending kids nap on schedule, hustle culture",
    topics: [
      "using a nap window for real deep work instead of catching up on email",
      "after-bedtime 90 minutes: one focused block before you collapse",
      "working with a toddler in the next room — headphones, doors, and expectations",
      "early-morning focus before the house wakes up",
      "when every plan breaks — restarting after an interrupted session without shame",
      "virtual coworking for parents who cannot go to a cafe",
      "batching shallow chores so the short focus window stays protected",
      "partner handoffs: protecting each other's focus blocks",
      "studying or upskilling after kids sleep without phone scrolls",
      "body doubling when your only adult company is online",
      "finishing one work item before bedtime so tomorrow is lighter",
      "free online coworking when childcare and memberships already stretch the budget",
      "planning tomorrow in 10 minutes after kids are down",
      "weekend focus when family time and deadlines collide",
    ],
  },

  "career-switch": {
    id: "career-switch",
    label: "Career switchers",
    pillar: {
      path: "/study-with-me",
      label: "studying with me online",
    },
    audience:
      "people studying for a career change after a full-time day job — bootcamps, certifications, portfolio work, second-shift learning",
    voice:
      "second-shift realistic. Tired evenings, weekends, comparison with full-time students. Concrete study blocks, not motivational speeches.",
    mustInclude:
      "at least one evening or weekend study protocol that fits around a day job",
    avoid:
      "country-specific exam names, 'quit your job' advice, bootcamp ads, vague 'believe in yourself' filler",
    topics: [
      "second-shift studying after a full-time job without burning out",
      "bootcamp evenings: protecting a 50-minute block when fatigue wins",
      "portfolio projects that stall every night — a start ritual that beats netflix",
      "weekend study marathons vs shorter daily blocks for career switchers",
      "when classmates are full-time and you are not — staying on your own plan",
      "study with me online after work when everyone else is free",
      "certification prep squeezed between meetings and commute",
      "shame after a wasted study week — restarting without a total reset",
      "body doubling for career switchers learning alone at home",
      "batching shallow admin so deep learning gets a real slot",
      "protecting Saturday morning study before life fills the calendar",
      "free study-with-me options when paid cohorts feel like overkill",
      "finishing one lesson before opening five more tabs of resources",
      "planning tomorrow's study in 10 minutes so evenings do not renegotiate",
    ],
  },

  writers: {
    id: "writers",
    label: "Writers & long-form",
    pillar: {
      path: "/body-doubling",
      label: "body doubling",
    },
    audience:
      "writers and long-form creators stuck on blank pages, editing loops, and isolation — not generic remote freelancers",
    voice:
      "craft-aware and practical. Drafting vs editing, word counts, resistance. Prefer sessions over muse mythology.",
    mustInclude:
      "at least one concrete writing or editing session structure (word target, timer, or shutdown)",
    avoid:
      "romantic starving-artist tropes, hustle content-mill advice, SEO spam framing as the whole craft",
    topics: [
      "blank page mornings: a five-minute start that beats rewriting the outline forever",
      "drafting sprints vs editing spirals — separating the modes",
      "body doubling for writers who stall alone at the desk",
      "when research tabs eat the writing block",
      "finishing one section before opening three new drafts",
      "accountability without a critique group that becomes a hangout",
      "evening writing after a day job without doomscrolling",
      "quiet co-writing sessions when cafe noise is too much",
      "recovering after a bad writing day without a full reset",
      "protecting a morning pages or deep-draft hour",
      "editing sprints with a clear stop condition",
      "free virtual coworking when paid writer rooms feel like overkill",
      "planning tomorrow's writing in 10 minutes",
      "long-form projects: weekly ritual so solitude does not feel endless",
    ],
  },

  law: {
    id: "law",
    label: "Law school & articling",
    pillar: {
      path: "/study-with-me",
      label: "studying with me online",
    },
    audience:
      "law students and articling / junior associates under long reading loads, cold calls, and generic bar-style prep — global English, no country-specific exam brands",
    voice:
      "practical and calm. Case briefing, outlines, long reading days. Never promise rankings or bar results. No country-specific exam names.",
    mustInclude:
      "at least one concrete study or reading session tactic (timer, briefing quota, outline block) without naming a national bar exam",
    avoid:
      "naming specific national bar exams, rank guarantees, firm recruiting ads, hustle culture, legal advice",
    topics: [
      "case briefing sessions that do not turn into passive highlighting",
      "outlining when the syllabus feels infinite — three targets for today",
      "studying after a long clinic or firm day without collapsing",
      "library energy at home for law students who cannot stay on campus",
      "generic bar-style practice blocks that do not become phone scrolls",
      "cold-call anxiety and starting the next reading assignment anyway",
      "study with me online during exam season without burnout the night before",
      "body doubling for solo law study when study groups become hangouts",
      "active recall for doctrines that beat rereading outlines",
      "protecting a morning review block before classes",
      "articling evenings: reclaiming one focused learning hour",
      "free study-with-me options when paid tutoring is out of reach",
      "finishing one subject block before hopping between five outlines",
      "shame after a wasted reading day — restarting without a full reset",
    ],
  },

  nurses: {
    id: "nurses",
    label: "Nursing & shift work",
    pillar: {
      path: "/study-with-me",
      label: "studying with me online",
    },
    audience:
      "nursing students and working nurses on 12-hour shifts dealing with inverted sleep, CE requirements, and post-shift study — distinct from med-school wards",
    voice:
      "shift-work realistic. Exhaustion, nights, short windows. Compassionate, not heroic. Not medical advice.",
    mustInclude:
      "at least one post-shift or between-shift study protocol that respects sleep and recovery",
    avoid:
      "medical advice, diagnosing readers, country-specific nursing exam brand names as the hook, 'nurses are heroes so push harder'",
    topics: [
      "studying after a 12-hour nursing shift without wrecking sleep",
      "night-shift inverted sleep: when to place a short focus block",
      "CE modules that stall every week — a 25-minute start that finishes one unit",
      "preceptorship exhaustion and still needing exam review",
      "study with me after night shift when the house is loud in the morning",
      "body doubling for nurses studying alone between rotations",
      "batching short recall sessions on break days instead of one mythical free afternoon",
      "protecting recovery days while keeping a tiny study minimum",
      "when family treats your day off like free time",
      "finishing one CE topic before opening five browser tabs",
      "quiet co-study when you cannot go to the campus library",
      "free online study rooms for nursing students on a tight budget",
      "shame after falling behind on review — restarting without a total reset",
      "transition from floor to desk: a five-minute warm-up that beats scrolling",
    ],
  },

  founders: {
    id: "founders",
    label: "Founders & indie makers",
    pillar: {
      path: "/virtual-coworking",
      label: "virtual coworking",
    },
    audience:
      "solo founders and indie makers context-switching between sales, support, and build — not IC software engineers",
    voice:
      "builder-realistic. Calendar whiplash, lonely decisions, shipping under uncertainty. Concrete sessions, no hustle-porn.",
    mustInclude:
      "a concrete founder scenario (sales vs build, support interrupt, solo loneliness) and a session structure",
    avoid:
      "rise-and-grind, fake vanity metrics, VC pitch theater, treating IC engineering tips as founder advice",
    topics: [
      "protecting a build block when sales and support eat the day",
      "solo founder loneliness — virtual coworking that is not another Twitter space",
      "context-switching tax: sales calls then deep product work",
      "ending the day with something shipped when everything feels interruptible",
      "when you are the only one on the team and accountability is optional",
      "morning founder focus before Slack and email wake up",
      "batching customer support so maker time stays real",
      "side-by-side coworking for indie hackers who miss a co-founder in the room",
      "recovering after a day of meetings with no product progress",
      "planning tomorrow in 10 minutes so you do not renegotiate all morning",
      "free Focusmate-style sessions when paid founder clubs feel like overkill",
      "finishing one product task before opening three strategy docs",
      "timezone loneliness when your customers and collaborators are elsewhere",
      "shutdown ritual so founder brain stops spinning at night",
    ],
  },

  teachers: {
    id: "teachers",
    label: "Teachers & educators",
    pillar: {
      path: "/body-doubling",
      label: "body doubling",
    },
    audience:
      "teachers and educators grading and lesson-planning in the evenings after a full school day",
    voice:
      "school-day realistic. Exhaustion, stacks of grading, Sunday scaries. Practical blocks, not inspirational posters.",
    mustInclude:
      "at least one evening or weekend session structure for grading or lesson planning with a clear stop",
    avoid:
      "education-system politics as the main thesis, shaming teachers, pretending unpaid evening work is noble",
    topics: [
      "grading after school without losing the whole evening",
      "lesson planning Sunday scaries — a timed block with a stop condition",
      "body doubling for teachers working alone at the kitchen table",
      "batching shallow school admin so deep planning gets a slot",
      "when exhaustion makes every worksheet take forever",
      "protecting one planning hour before parent emails fill the night",
      "quiet co-working for educators who cannot stay at school late",
      "finishing one class set before opening three more stacks",
      "weekend prep that does not steal all recovery",
      "virtual coworking when the teachers' lounge is not an option",
      "restarting after a week of falling behind on grading",
      "free online coworking when classroom budgets already feel tight",
      "planning tomorrow's lessons in 10 minutes so evenings do not spiral",
      "after-school focus when family life starts the second you walk in",
    ],
  },
};

/** Original five — used by locale / German rotators and legacy manuals. */
export const LOCALE_CATEGORY_IDS = [
  "productivity",
  "adhd",
  "exams",
  "loneliness",
  "remote",
];

/** English scheduled slots rotate these community niches. */
export const COMMUNITY_CATEGORY_IDS = [
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

export const CATEGORY_IDS = Object.keys(CATEGORIES);

/** Commercial hub pages — generator may require one of these for free-angled topics. */
export const COMMERCIAL_HUBS = [
  { path: "/pricing", label: "Refocus pricing (free period)" },
  { path: "/free", label: "Refocus free period summary" },
  { path: "/focusmate-alternative", label: "Refocus vs Focusmate" },
  { path: "/flown-alternative", label: "Refocus vs FLOWN" },
  { path: "/cofocus-alternative", label: "Refocus vs Cofocus" },
  { path: "/studystream-alternative", label: "Refocus vs StudyStream" },
];

/** Detect topics that should reinforce free / alternatives hubs. */
export function isFreeCommercialTopic(topic) {
  const t = String(topic || "").toLowerCase();
  return /\bfree\b|alternative|focusmate|membership|pricing|session cap|paid/.test(
    t,
  );
}

/** Legacy helper — niches now publish via daily slot workflows. */
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
    med: "med-school",
    medicine: "med-school",
    medical: "med-school",
    residency: "med-school",
    dissertation: "phd",
    "grad-school": "phd",
    engineering: "engineers",
    software: "engineers",
    "software-engineers": "engineers",
    parenting: "parents",
    "working-parents": "parents",
    "career-change": "career-switch",
    bootcamp: "career-switch",
    writing: "writers",
    "law-school": "law",
    nursing: "nurses",
    founder: "founders",
    "indie-makers": "founders",
    teaching: "teachers",
    educators: "teachers",
  };
  const resolved = aliases[key] || key;
  return CATEGORIES[resolved] || null;
}

export function pickCategoryByUtcHour(date = new Date()) {
  const ids = COMMUNITY_CATEGORY_IDS;
  return ids[date.getUTCHours() % ids.length];
}
