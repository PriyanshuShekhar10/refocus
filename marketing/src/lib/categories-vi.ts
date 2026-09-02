import type { CategoryId } from "./categories";

export type CategoryMetaVi = {
  id: CategoryId;
  label: string;
  description: string;
  intro: string;
  pillar: { path: string; label: string };
};

export const CATEGORIES_VI: Record<CategoryId, CategoryMetaVi> = {
  productivity: {
    id: "productivity",
    label: "Năng suất",
    description: "Thói quen tập trung thực tế — deep work, time-boxing — không motivation rỗng.",
    intro: "Chiến thuật cụ thể cho deep work và bắt đầu công việc.",
    pillar: { path: "/body-doubling", label: "body doubling" },
  },
  adhd: {
    id: "adhd",
    label: "ADHD & tập trung",
    description: "Chiến lược cho não ADHD — body doubling, cấu trúc bên ngoài.",
    intro: "Ghi chú thực tế về executive dysfunction và task initiation.",
    pillar: { path: "/body-doubling", label: "body doubling cho ADHD" },
  },
  exams: {
    id: "exams",
    label: "Thi cử & ôn thi",
    description: "Phiên học cho THPT, đại học, IELTS — ôn thi một mình.",
    intro: "Chiến thuật cho khối ôn và sau mock thi.",
    pillar: { path: "/study-with-me", label: "học cùng online" },
  },
  loneliness: {
    id: "loneliness",
    label: "Cô đơn",
    description: "Học một mình — và co-presence yên lặng giúp gì.",
    intro: "Cho người grind ở nhà hàng tháng.",
    pillar: { path: "/virtual-coworking", label: "coworking ảo" },
  },
  remote: {
    id: "remote",
    label: "Remote & freelance",
    description: "Thiết kế phiên cho freelancer HCMC/Hanoi, WFH.",
    intro: "Thực tế với meeting, client, và distraction ở nhà.",
    pillar: { path: "/virtual-coworking", label: "coworking ảo" },
  },
};

export function categoryLabelVi(id?: string): string {
  return (
    (id && CATEGORIES_VI[id as CategoryId]?.label) ||
    CATEGORIES_VI.productivity.label
  );
}

export function categoryMetaVi(id?: string): CategoryMetaVi {
  return (id && CATEGORIES_VI[id as CategoryId]) || CATEGORIES_VI.productivity;
}
