/**
 * Locale registry for blog post generation (en | id | fil | vi).
 */

import {
  CATEGORIES,
  getCategory,
  pickCategoryByUtcHour,
} from "./blog-categories.mjs";
import { CATEGORIES_ID, getCategoryId } from "./blog-categories-id.mjs";
import { CATEGORIES_FIL, getCategoryFil } from "./blog-categories-fil.mjs";
import { CATEGORIES_VI, getCategoryVi } from "./blog-categories-vi.mjs";

export const LOCALE_IDS = ["en", "id", "fil", "vi"];

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
};

export function resolveLocaleConfig(raw) {
  const key = String(raw || "en")
    .trim()
    .toLowerCase();
  return LOCALE_CONFIG[key] || LOCALE_CONFIG.en;
}
