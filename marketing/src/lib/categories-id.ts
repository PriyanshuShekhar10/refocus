import type { CategoryId } from "./categories";

export type CategoryMetaId = {
  id: CategoryId;
  label: string;
  description: string;
  intro: string;
  pillar: { path: string; label: string };
};

export const CATEGORIES_ID: Record<CategoryId, CategoryMetaId> = {
  productivity: {
    id: "productivity",
    label: "Produktivitas",
    description:
      "Rutinitas fokus praktis — deep work, time-boxing, memulai — tanpa motivasi kosong.",
    intro:
      "Taktik konkret untuk deep work dan memulai: time-boxing, ritual shutdown, dan mengalahkan resistensi halaman kosong.",
    pillar: { path: "/id/body-doubling", label: "body doubling" },
  },
  adhd: {
    id: "adhd",
    label: "ADHD & fokus",
    description:
      "Strategi fokus yang cocok untuk otak ADHD — struktur eksternal, body doubling, memulai tanpa malu.",
    intro:
      "Catatan praktis tentang executive dysfunction, task initiation, dan scaffolding fokus yang tidak bergantung willpower.",
    pillar: { path: "/id/body-doubling", label: "body doubling untuk ADHD" },
  },
  exams: {
    id: "exams",
    label: "Ujian & seleksi",
    description:
      "Desain sesi belajar untuk UTBK/SNBT, seleksi PTN, dan ujian sekolah — persiapan panjang sendirian.",
    intro:
      "Taktik belajar spesifik: blok revisi, setelah tryout, dan tetap pada rencana sendiri tanpa membandingkan dengan teman.",
    pillar: { path: "/id/study-with-me", label: "belajar bersama online" },
  },
  loneliness: {
    id: "loneliness",
    label: "Kesepian & belajar sendiri",
    description:
      "Isolasi saat belajar sendiri — dan bagaimana co-presence tenang bisa membantu.",
    intro:
      "Untuk yang grind di rumah: beda antara butuh teman dan butuh obrolan, serta cara dapat fokus bersama tanpa ramai.",
    pillar: { path: "/id/study-with-me", label: "partner belajar tenang" },
  },
  remote: {
    id: "remote",
    label: "Kerja remote & freelance",
    description:
      "Desain sesi untuk pekerja remote, freelancer, dan maker yang kangen energi kantor.",
    intro:
      "Taktik fokus realistis untuk WFH: melindungi blok deep work di antara meeting, klien, Slack, dan gangguan rumah.",
    pillar: { path: "/id/virtual-coworking", label: "coworking virtual" },
  },
};

export function categoryLabelId(id?: string): string {
  return (
    (id && CATEGORIES_ID[id as CategoryId]?.label) ||
    CATEGORIES_ID.productivity.label
  );
}

export function categoryMetaId(id?: string): CategoryMetaId {
  return (id && CATEGORIES_ID[id as CategoryId]) || CATEGORIES_ID.productivity;
}
