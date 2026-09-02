export type Locale = "en" | "id";

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALES: Record<
  Locale,
  { label: string; htmlLang: string; pathPrefix: string }
> = {
  en: { label: "English", htmlLang: "en", pathPrefix: "" },
  id: { label: "Bahasa Indonesia", htmlLang: "id", pathPrefix: "/id" },
};

export function localePath(locale: Locale, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale === "en") return normalized;
  if (normalized === "/") return "/id";
  return `/id${normalized}`;
}

export function hreflangAlternates(path: string): { hreflang: string; href: string }[] {
  const site = "https://refocus.co.in";
  const enPath = path === "/id" ? "/" : path.replace(/^\/id/, "") || "/";
  const idPath = path.startsWith("/id") ? path : path === "/" ? "/id" : `/id${path}`;
  return [
    { hreflang: "en", href: `${site}${enPath}` },
    { hreflang: "id", href: `${site}${idPath}` },
    { hreflang: "x-default", href: `${site}${enPath}` },
  ];
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
