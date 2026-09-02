export type Locale = "en" | "id" | "fil" | "vi";

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALES: Record<
  Locale,
  { label: string; htmlLang: string; pathPrefix: string }
> = {
  en: { label: "English", htmlLang: "en", pathPrefix: "" },
  id: { label: "Bahasa Indonesia", htmlLang: "id", pathPrefix: "/id" },
  fil: { label: "Filipino (Tagalog)", htmlLang: "fil", pathPrefix: "/fil" },
  vi: { label: "Tiếng Việt", htmlLang: "vi", pathPrefix: "/vi" },
};

export function localePath(locale: Locale, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale === "en") return normalized;
  const prefix = LOCALES[locale].pathPrefix;
  if (normalized === "/") return prefix;
  return `${prefix}${normalized}`;
}

/** hreflang alternates for pages that exist in multiple locales. */
export function hreflangAlternates(path: string): { hreflang: string; href: string }[] {
  const site = "https://refocus.co.in";

  // Blog hubs (all four locales have a blog index).
  if (path === "/blog" || path.endsWith("/blog")) {
    return [
      { hreflang: "en", href: `${site}/blog` },
      { hreflang: "id", href: `${site}/id/blog` },
      { hreflang: "fil", href: `${site}/fil/blog` },
      { hreflang: "vi", href: `${site}/vi/blog` },
      { hreflang: "x-default", href: `${site}/blog` },
    ];
  }

  // Indonesian money pages ↔ English equivalents.
  if (path.startsWith("/id")) {
    const enPath = path.replace(/^\/id/, "") || "/";
    return [
      { hreflang: "en", href: `${site}${enPath}` },
      { hreflang: "id", href: `${site}${path}` },
      { hreflang: "x-default", href: `${site}${enPath}` },
    ];
  }

  // Filipino blog-first locale (no money-page pairs yet).
  if (path.startsWith("/fil")) {
    return [
      { hreflang: "fil", href: `${site}${path}` },
      { hreflang: "x-default", href: `${site}/` },
    ];
  }

  // Vietnamese blog-first locale.
  if (path.startsWith("/vi")) {
    return [
      { hreflang: "vi", href: `${site}${path}` },
      { hreflang: "x-default", href: `${site}/` },
    ];
  }

  return [{ hreflang: "en", href: `${site}${path}` }, { hreflang: "x-default", href: `${site}${path}` }];
}

/** Short copy for /id/ money pages (human-reviewed, not auto-translated blog). */
export const ID_PAGE_COPY = {
  home: {
    title: "Refocus — Ruang fokus virtual & coworking untuk deep work",
    description:
      "Ruang fokus virtual gratis untuk belajar dan kerja: 25, 50, atau 75 menit dengan partner. Body doubling — bukan lobby ramai.",
    h1: "Ruang fokus virtual untuk belajar dan kerja mendalam",
    lead: "Sesi terjadwal dengan timer bersama. Body doubling online — tanpa kartu kredit selama periode gratis.",
  },
  bodyDoubling: {
    title: "Body doubling",
    heading: "Apa itu body doubling?",
    lead: "Body doubling berarti bekerja atau belajar di samping orang lain (secara virtual) agar lebih mudah memulai dan tetap fokus — tanpa harus ngobrol.",
  },
  virtualCoworking: {
    title: "Coworking virtual",
    heading: "Coworking virtual untuk kerja dan belajar sendirian",
    lead: "Energi kantor atau perpustakaan — dari rumah. Sesi fokus dengan orang lain yang juga sedang mengerjakan tugasnya.",
  },
  focusRoom: {
    title: "Ruang fokus",
    heading: "Ruang fokus online",
    lead: "Masuk sesi, nyalakan kamera jika mau, dan kerjakan daftar tugasmu sambil timer berjalan.",
  },
  features: {
    title: "Fitur",
    heading: "Fitur Refocus",
    lead: "Sesi terjadwal, partner fokus, mode quiet, teman, dan chat global — dirancang untuk deep work, bukan meeting.",
  },
  pricing: {
    title: "Harga",
    heading: "Harga Refocus",
    lead: "Periode gratis: tanpa kartu kredit, tanpa batas sesi mingguan selama kampanye berlangsung. Daftar dan mulai sesi fokus.",
  },
  blog: {
    title: "Blog",
    heading: "Catatan tentang fokus, ujian, ADHD & coworking",
    lede: "Tips praktis tentang deep work, persiapan UTBK/SNBT, belajar sendirian, dan kerja remote — dalam Bahasa Indonesia.",
  },
} as const;
