/**
 * Locale registry for blog post generation (en | id | fil | vi | de).
 */

import {
  CATEGORIES,
  getCategory,
  pickCategoryByUtcHour,
} from "./blog-categories.mjs";
import { CATEGORIES_ID, getCategoryId } from "./blog-categories-id.mjs";
import { CATEGORIES_FIL, getCategoryFil } from "./blog-categories-fil.mjs";
import { CATEGORIES_VI, getCategoryVi } from "./blog-categories-vi.mjs";
import { CATEGORIES_DE, getCategoryDe } from "./blog-categories-de.mjs";

export const LOCALE_IDS = ["en", "id", "fil", "vi", "de"];

const LANDING_PAGES_EN = [
  "/body-doubling — What body doubling is and how to do it online",
  "/virtual-coworking — Virtual coworking for remote/solo focus",
  "/study-with-me — Study-with-me online study rooms",
  "/pricing — Free period pricing",
  "/free — Short free-period summary",
  "/focusmate-alternative — Refocus vs Focusmate comparison",
];

const LANDING_PAGES_ID = [
  "/id/body-doubling — Panduan body doubling online",
  "/id/virtual-coworking — Coworking virtual untuk fokus",
  "/id/study-with-me — Belajar bersama online",
  "/id/pricing — Harga periode gratis",
  "/id/features — Fitur Refocus",
];

const LANDING_PAGES_FIL = [
  "/fil/blog — Blog Refocus (Filipino)",
  "/body-doubling — Body doubling guide (English)",
  "/virtual-coworking — Virtual coworking",
  "/study-with-me — Study with me online",
  "/pricing — Pricing",
];

const LANDING_PAGES_VI = [
  "/vi/blog — Blog Refocus (Tiếng Việt)",
  "/body-doubling — Body doubling guide (English)",
  "/virtual-coworking — Virtual coworking",
  "/study-with-me — Study with me online",
  "/pricing — Pricing",
];

const LINK_BANK_EN = {
  productivity: [
    "https://www.calnewport.com/blog/ — Deep Work / Cal Newport",
    "https://todoist.com/productivity-methods/pomodoro-technique — Pomodoro",
    "https://jamesclear.com/atomic-habits — Atomic Habits",
    "https://www.apa.org/topics/stress — APA on stress",
  ],
  adhd: [
    "https://www.cdc.gov/adhd/ — CDC ADHD",
    "https://chadd.org/ — CHADD",
    "https://en.wikipedia.org/wiki/Body_doubling — body doubling",
  ],
  exams: [
    "https://en.wikipedia.org/wiki/Active_learning — active learning",
    "https://www.khanacademy.org/ — Khan Academy",
    "https://www.ets.org/gre.html — GRE (generic test prep)",
    "https://www.bbc.com/bitesize — BBC Bitesize study skills",
  ],
  loneliness: [
    "https://www.cdc.gov/emotional-wellbeing/social-connectedness/index.htm — social connectedness",
    "https://www.apa.org/monitor/2019/05/ce-corner-isolation — loneliness",
  ],
  remote: [
    "https://www.buffer.com/state-of-remote-work — remote work",
    "https://www.ilo.org/topics/telework — ILO telework",
    "https://en.wikipedia.org/wiki/Remote_work — remote work overview",
  ],
  "med-school": [
    "https://en.wikipedia.org/wiki/Spaced_repetition — spaced repetition",
    "https://www.ankiweb.net/ — Anki",
    "https://www.ama-assn.org/ — American Medical Association (general)",
  ],
  phd: [
    "https://thesiswhisperer.com/ — The Thesis Whisperer",
    "https://en.wikipedia.org/wiki/Academic_writing — academic writing",
    "https://www.apa.org/ — APA (research & wellbeing)",
  ],
  engineers: [
    "https://www.calnewport.com/blog/ — Deep Work / Cal Newport",
    "https://en.wikipedia.org/wiki/Maker_culture — maker / focus time",
    "https://sloanreview.mit.edu/ — MIT Sloan (knowledge work)",
  ],
  parents: [
    "https://www.apa.org/topics/stress — APA on stress",
    "https://www.cdc.gov/emotional-wellbeing/ — emotional wellbeing",
    "https://en.wikipedia.org/wiki/Work%E2%80%93life_balance — work–life balance",
  ],
  "career-switch": [
    "https://www.khanacademy.org/ — Khan Academy",
    "https://en.wikipedia.org/wiki/Active_learning — active learning",
    "https://www.bbc.com/bitesize — BBC Bitesize study skills",
  ],
  writers: [
    "https://en.wikipedia.org/wiki/Free_writing — free writing",
    "https://jamesclear.com/atomic-habits — Atomic Habits",
    "https://www.apa.org/topics/stress — APA on stress",
  ],
  law: [
    "https://en.wikipedia.org/wiki/Active_learning — active learning",
    "https://www.khanacademy.org/ — Khan Academy",
    "https://en.wikipedia.org/wiki/Casebook_method — casebook / briefing methods",
  ],
  nurses: [
    "https://en.wikipedia.org/wiki/Spaced_repetition — spaced repetition",
    "https://www.cdc.gov/ — CDC (general health education)",
    "https://en.wikipedia.org/wiki/Shift_work — shift work",
  ],
  founders: [
    "https://www.buffer.com/state-of-remote-work — remote / distributed work",
    "https://en.wikipedia.org/wiki/Indie_business — indie / small business",
    "https://www.calnewport.com/blog/ — Deep Work / Cal Newport",
  ],
  teachers: [
    "https://www.edutopia.org/ — Edutopia",
    "https://en.wikipedia.org/wiki/Lesson_plan — lesson planning",
    "https://www.apa.org/topics/stress — APA on stress",
  ],
};

const LINK_BANK_ID = {
  productivity: [
    "https://id.wikipedia.org/wiki/Manajemen_waktu — manajemen waktu",
    "https://www.kompas.com/tag/produktivitas — Kompas produktivitas",
  ],
  adhd: [
    "https://id.wikipedia.org/wiki/Gangguan_belahan_otak_dengan_hipertivitas — ADHD",
  ],
  exams: [
    "https://snbt.kemdikbud.go.id/ — SNBT resmi",
    "https://utbk-sbmptn.id/ — UTBK/SBMPTN",
  ],
  loneliness: ["https://id.wikipedia.org/wiki/Kesepian — kesepian"],
  remote: [
    "https://id.wikipedia.org/wiki/Kerja_jarak_jauh — WFH",
    "https://www.kompas.com/tag/freelancer — freelancer",
  ],
};

const LINK_BANK_FIL = {
  productivity: [
    "https://tl.wikipedia.org/wiki/Produktibidad — produktibidad",
    "https://www.rappler.com/life-and-style/ — Rappler life & style",
  ],
  adhd: [
    "https://en.wikipedia.org/wiki/Body_doubling — body doubling",
    "https://www.cdc.gov/adhd/ — CDC ADHD (English reference)",
  ],
  exams: [
    "https://www.prc.gov.ph/ — Professional Regulation Commission",
    "https://upcat.up.edu.ph/ — UPCAT",
  ],
  loneliness: [
    "https://en.wikipedia.org/wiki/Loneliness — loneliness overview",
  ],
  remote: [
    "https://en.wikipedia.org/wiki/Business_process_outsourcing_in_the_Philippines — BPO Philippines",
  ],
};

const LINK_BANK_VI = {
  productivity: [
    "https://vi.wikipedia.org/wiki/Qu%E1%BA%A3n_l%C3%BD_th%E1%BB%9Di_gian — quản lý thời gian",
  ],
  adhd: [
    "https://vi.wikipedia.org/wiki/R%E1%BB%91i_lo%E1%BA%A1n_t%C3%ADnh_hyperactivity_v%C3%A0_thi%E1%BA%BFu_ch%C3%BA_%C3%BD — ADHD",
  ],
  exams: [
    "https://moet.gov.vn/ — Bộ GD&ĐT Việt Nam",
    "https://vi.wikipedia.org/wiki/K%E1%BB%B3_thi_t%E1%BB%91t_nghi%E1%87%7Bp_trung_h%E1%BB%8Dc_ph%E1%BB%95_th%C3%B4ng — kỳ thi THPT",
  ],
  loneliness: [
    "https://vi.wikipedia.org/wiki/C%C4%91%C6%A1n — cô đơn",
  ],
  remote: [
    "https://vi.wikipedia.org/wiki/L%C3%A0m_vi%E1%BB%87c_t%E1%BB%AB_xa — làm việc từ xa",
  ],
};

const LANDING_PAGES_DE = [
  "/de/blog — Blog Refocus (Deutsch)",
  "/body-doubling — Body Doubling Guide (Englisch)",
  "/virtual-coworking — Virtuelles Coworking",
  "/study-with-me — Study with me online",
  "/pricing — Preise",
];

const LINK_BANK_DE = {
  productivity: [
    "https://de.wikipedia.org/wiki/Zeitmanagement — Zeitmanagement",
    "https://de.wikipedia.org/wiki/Pomodoro-Technik — Pomodoro-Technik",
  ],
  adhd: [
    "https://de.wikipedia.org/wiki/Aufmerksamkeitsdefizit-/Hyperaktivit%C3%A4tsst%C3%B6rung — ADHS",
    "https://en.wikipedia.org/wiki/Body_doubling — Body Doubling",
  ],
  exams: [
    "https://de.wikipedia.org/wiki/Abitur — Abitur",
    "https://de.wikipedia.org/wiki/Numerus_clausus — Numerus clausus",
  ],
  loneliness: [
    "https://de.wikipedia.org/wiki/Einsamkeit — Einsamkeit",
  ],
  remote: [
    "https://de.wikipedia.org/wiki/Telearbeit — Telearbeit / Homeoffice",
    "https://de.wikipedia.org/wiki/Freiberufler — Freiberufler",
  ],
};

export const LOCALE_CONFIG = {
  en: {
    id: "en",
    contentSubdir: "blog",
    urlPrefix: "/blog",
    categories: CATEGORIES,
    getCategory: getCategory,
    pickCategory: pickCategoryByUtcHour,
    author: "Refocus Team",
    landingPages: LANDING_PAGES_EN,
    linkBank: LINK_BANK_EN,
    defaultPillar: { path: "/body-doubling", label: "body doubling" },
    langRule:
      "Write in global English for an international audience. Do NOT name country-specific exams (no UPSC, NEET, JEE, UTBK, SNBT, PNLE, THPT, etc.) or India-only geo.",
    langUser: "Write in global English.",
    pricingPath: "/pricing",
    freePath: "/free",
    altPath: "/focusmate-alternative",
    pillarInject:
      "If you're new to the idea, see our guide to [{label}]({url}).",
    localeField: null,
  },
  id: {
    id: "id",
    contentSubdir: "blog-id",
    urlPrefix: "/id/blog",
    categories: CATEGORIES_ID,
    getCategory: getCategoryId,
    pickCategory: pickCategoryByUtcHour,
    author: "Tim Refocus",
    landingPages: LANDING_PAGES_ID,
    linkBank: LINK_BANK_ID,
    defaultPillar: { path: "/id/body-doubling", label: "body doubling" },
    langRule:
      "Write the ENTIRE article in natural Bahasa Indonesia. Do NOT mention JEE, UPSC, NEET, or Indian exams. Use UTBK/SNBT/Indonesia context for exam niche.",
    langUser: "Write in Bahasa Indonesia.",
    pricingPath: "/id/pricing",
    freePath: "/id/features",
    altPath: "/id/features",
    pillarInject:
      "Jika baru mengenal konsep ini, baca [panduan {label}]({url}) kami.",
    localeField: "id",
  },
  fil: {
    id: "fil",
    contentSubdir: "blog-fil",
    urlPrefix: "/fil/blog",
    categories: CATEGORIES_FIL,
    getCategory: getCategoryFil,
    pickCategory: pickCategoryByUtcHour,
    author: "Tim Refocus",
    landingPages: LANDING_PAGES_FIL,
    linkBank: LINK_BANK_FIL,
    defaultPillar: { path: "/body-doubling", label: "body doubling" },
    langRule:
      "Write the ENTIRE article in natural Tagalog/Filipino. Use Philippines exam context (PNLE, LET, UPCAT, board exam) for exam niche. Do NOT mention Indian, Indonesian, or Vietnamese exams.",
    langUser: "Write in Tagalog/Filipino.",
    pricingPath: "/pricing",
    freePath: "/free",
    altPath: "/focusmate-alternative",
    pillarInject:
      "Kung bago sa iyo ang konsepto, basahin ang gabay namin sa [{label}]({url}).",
    localeField: "fil",
  },
  vi: {
    id: "vi",
    contentSubdir: "blog-vi",
    urlPrefix: "/vi/blog",
    categories: CATEGORIES_VI,
    getCategory: getCategoryVi,
    pickCategory: pickCategoryByUtcHour,
    author: "Refocus Team",
    landingPages: LANDING_PAGES_VI,
    linkBank: LINK_BANK_VI,
    defaultPillar: { path: "/body-doubling", label: "body doubling" },
    langRule:
      "Write the ENTIRE article in natural Vietnamese. Use Vietnam exam context (THPT, đại học, IELTS VN) for exam niche. Do NOT mention Indian, Indonesian, or Philippines exams.",
    langUser: "Write in Vietnamese.",
    pricingPath: "/pricing",
    freePath: "/free",
    altPath: "/focusmate-alternative",
    pillarInject:
      "Nếu bạn mới biết ý tưởng này, xem hướng dẫn [{label}]({url}) của chúng tôi.",
    localeField: "vi",
  },
  de: {
    id: "de",
    contentSubdir: "blog-de",
    urlPrefix: "/de/blog",
    categories: CATEGORIES_DE,
    getCategory: getCategoryDe,
    pickCategory: pickCategoryByUtcHour,
    author: "Refocus Team",
    landingPages: LANDING_PAGES_DE,
    linkBank: LINK_BANK_DE,
    defaultPillar: { path: "/body-doubling", label: "Body Doubling" },
    langRule:
      "Write the ENTIRE article in natural German (Deutsch). Use DACH exam context (Abitur, Uni-Klausuren, Staatsexamen, Numerus Clausus) for exam niche. Do NOT mention Indian, Indonesian, Filipino, or Vietnamese exams.",
    langUser: "Write in German (Deutsch).",
    pricingPath: "/pricing",
    freePath: "/free",
    altPath: "/focusmate-alternative",
    pillarInject:
      "Falls du das Konzept noch nicht kennst, lies unseren Guide zu [{label}]({url}).",
    localeField: "de",
  },
};

export function resolveLocaleConfig(raw) {
  const key = String(raw || "en")
    .trim()
    .toLowerCase();
  return LOCALE_CONFIG[key] || LOCALE_CONFIG.en;
}
