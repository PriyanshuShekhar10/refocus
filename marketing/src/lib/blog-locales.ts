import type { LocaleCategoryId } from "./categories";

export type BlogLocaleKey = "id" | "fil" | "vi" | "de";

export type BlogLocaleUi = {
  key: BlogLocaleKey;
  htmlLang: string;
  pathPrefix: string;
  collection: "blogId" | "blogFil" | "blogVi" | "blogDe";
  dateLocale: string;
  homePath: string;
  blogPath: string;
  blog: {
    title: string;
    heading: string;
    lede: string;
    readMore: string;
    allPosts: string;
    minRead: string;
    related: string;
    empty: string;
    emptyCategory: string;
    home: string;
    english: string;
    paginationNewer: string;
    paginationOlder: string;
    paginationPage: (cur: number, total: number) => string;
    ctaTitle: string;
    ctaBody: string;
    ctaPillar: string;
    ctaBtn: string;
  };
  home: {
    title: string;
    description: string;
    h1: string;
    lead: string;
  };
  categoryLabel: (id?: string) => string;
  categoryMeta: (id?: string) => { label: string; description: string; intro: string; pillar: { path: string; label: string } };
  categories: Record<LocaleCategoryId, { label: string; description: string; intro: string; pillar: { path: string; label: string } }>;
};

import { CATEGORIES_ID, categoryLabelId, categoryMetaId } from "./categories-id";
import { CATEGORIES_FIL, categoryLabelFil, categoryMetaFil } from "./categories-fil";
import { CATEGORIES_VI, categoryLabelVi, categoryMetaVi } from "./categories-vi";
import { CATEGORIES_DE, categoryLabelDe, categoryMetaDe } from "./categories-de";

export const BLOG_LOCALES: Record<BlogLocaleKey, BlogLocaleUi> = {
  id: {
    key: "id",
    htmlLang: "id",
    pathPrefix: "/id",
    collection: "blogId",
    dateLocale: "id-ID",
    homePath: "/id",
    blogPath: "/id/blog",
    blog: {
      title: "Blog",
      heading: "Catatan tentang fokus, ujian, ADHD & coworking",
      lede: "Tips praktis tentang deep work, persiapan UTBK/SNBT, belajar sendirian, dan kerja remote — dalam Bahasa Indonesia.",
      readMore: "Baca",
      allPosts: "Semua artikel",
      minRead: "menit baca",
      related: "Lanjut baca",
      empty: "Belum ada artikel — segera hadir.",
      emptyCategory: "Belum ada artikel di topik ini.",
      home: "Beranda",
      english: "English",
      paginationNewer: "Lebih baru",
      paginationOlder: "Lebih lama",
      paginationPage: (cur, total) => `Halaman ${cur} dari ${total}`,
      ctaTitle: "Butuh teman tenang saat belajar atau kerja?",
      ctaBody: "Banyak orang fokus lebih baik dengan orang lain di ruangan — bahkan tanpa ngobrol.",
      ctaPillar: "Baru dengar istilahnya? Baca panduan",
      ctaBtn: "Lihat cara sesi bekerja",
    },
    home: {
      title: "Refocus — Ruang fokus virtual & coworking",
      description: "Ruang fokus virtual gratis untuk belajar dan kerja — body doubling, bukan lobby ramai.",
      h1: "Ruang fokus virtual untuk belajar dan kerja mendalam",
      lead: "Sesi terjadwal dengan timer bersama. Body doubling online — tanpa kartu kredit selama periode gratis.",
    },
    categoryLabel: categoryLabelId,
    categoryMeta: categoryMetaId,
    categories: CATEGORIES_ID,
  },
  fil: {
    key: "fil",
    htmlLang: "fil",
    pathPrefix: "/fil",
    collection: "blogFil",
    dateLocale: "fil-PH",
    homePath: "/fil",
    blogPath: "/fil/blog",
    blog: {
      title: "Blog",
      heading: "Mga tala tungkol sa focus, board exam, ADHD at coworking",
      lede: "Praktikal na tips sa deep work, board exam review, BPO/WFH, at body doubling — sa Tagalog.",
      readMore: "Basahin",
      allPosts: "Lahat ng artikulo",
      minRead: "minutong basahin",
      related: "Magbasa pa",
      empty: "Wala pang artikulo — abangan.",
      emptyCategory: "Wala pang artikulo sa paksang ito.",
      home: "Home",
      english: "English",
      paginationNewer: "Mas bago",
      paginationOlder: "Mas luma",
      paginationPage: (cur, total) => `Pahina ${cur} ng ${total}`,
      ctaTitle: "Kailangan ng tahimik na kasama habang nag-aaral o nagtatrabaho?",
      ctaBody: "Maraming tao mas nakakafocus kapag may kasama sa room — kahit walang usapan.",
      ctaPillar: "Bago sa konsepto? Basahin ang gabay sa",
      ctaBtn: "Tingnan kung paano gumagana ang session",
    },
    home: {
      title: "Refocus — Virtual focus room at coworking",
      description: "Libreng virtual focus room para sa pag-aaral at trabaho — body doubling, hindi maingay na lobby.",
      h1: "Virtual focus room para sa deep work",
      lead: "Naka-schedule na session na may shared timer. Body doubling online.",
    },
    categoryLabel: categoryLabelFil,
    categoryMeta: categoryMetaFil,
    categories: CATEGORIES_FIL,
  },
  vi: {
    key: "vi",
    htmlLang: "vi",
    pathPrefix: "/vi",
    collection: "blogVi",
    dateLocale: "vi-VN",
    homePath: "/vi",
    blogPath: "/vi/blog",
    blog: {
      title: "Blog",
      heading: "Ghi chú về tập trung, thi cử, ADHD & coworking",
      lede: "Mẹo thực tế về deep work, ôn thi THPT, làm remote tại Việt Nam — bằng tiếng Việt.",
      readMore: "Đọc",
      allPosts: "Tất cả bài viết",
      minRead: "phút đọc",
      related: "Đọc tiếp",
      empty: "Chưa có bài viết — sắp ra mắt.",
      emptyCategory: "Chưa có bài viết trong chủ đề này.",
      home: "Trang chủ",
      english: "English",
      paginationNewer: "Mới hơn",
      paginationOlder: "Cũ hơn",
      paginationPage: (cur, total) => `Trang ${cur} / ${total}`,
      ctaTitle: "Cần bạn yên lặng khi học hoặc làm việc?",
      ctaBody: "Nhiều người tập trung tốt hơn khi có người khác trong phòng — dù không nói chuyện.",
      ctaPillar: "Mới biết khái niệm? Xem hướng dẫn",
      ctaBtn: "Xem cách phiên hoạt động",
    },
    home: {
      title: "Refocus — Phòng focus ảo & coworking",
      description: "Phòng focus ảo miễn phí để học và làm việc — body doubling, không phải lobby ồn.",
      h1: "Phòng focus ảo cho deep work",
      lead: "Phiên theo lịch với timer chung. Body doubling trực tuyến.",
    },
    categoryLabel: categoryLabelVi,
    categoryMeta: categoryMetaVi,
    categories: CATEGORIES_VI,
  },
  de: {
    key: "de",
    htmlLang: "de",
    pathPrefix: "/de",
    collection: "blogDe",
    dateLocale: "de-DE",
    homePath: "/de",
    blogPath: "/de/blog",
    blog: {
      title: "Blog",
      heading: "Notizen zu Fokus, Prüfungen, ADHS & Coworking",
      lede: "Praktische Tipps zu Deep Work, Abitur & Uni, Homeoffice und Body Doubling — auf Deutsch.",
      readMore: "Lesen",
      allPosts: "Alle Artikel",
      minRead: "Min. Lesezeit",
      related: "Weiterlesen",
      empty: "Noch keine Artikel — bald verfügbar.",
      emptyCategory: "Noch keine Artikel in diesem Thema.",
      home: "Start",
      english: "English",
      paginationNewer: "Neuer",
      paginationOlder: "Älter",
      paginationPage: (cur, total) => `Seite ${cur} von ${total}`,
      ctaTitle: "Brauchst du eine ruhige Person neben dir beim Lernen oder Arbeiten?",
      ctaBody: "Viele Menschen fokussieren besser, wenn jemand anderes im Raum ist — auch ohne Smalltalk.",
      ctaPillar: "Neu beim Konzept? Lies den Guide zu",
      ctaBtn: "So funktionieren Sessions",
    },
    home: {
      title: "Refocus — Virtueller Fokusraum & Coworking",
      description: "Kostenloser virtueller Fokusraum zum Lernen und Arbeiten — Body Doubling, kein lautes Lobby.",
      h1: "Virtueller Fokusraum für Deep Work",
      lead: "Geplante Sessions mit gemeinsamen Timer. Body Doubling online.",
    },
    categoryLabel: categoryLabelDe,
    categoryMeta: categoryMetaDe,
    categories: CATEGORIES_DE,
  },
};

export function getBlogLocale(key: BlogLocaleKey): BlogLocaleUi {
  return BLOG_LOCALES[key];
}
