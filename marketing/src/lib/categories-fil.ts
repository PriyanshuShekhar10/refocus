import type { CategoryId } from "./categories";

export type CategoryMetaFil = {
  id: CategoryId;
  label: string;
  description: string;
  intro: string;
  pillar: { path: string; label: string };
};

export const CATEGORIES_FIL: Record<CategoryId, CategoryMetaFil> = {
  productivity: {
    id: "productivity",
    label: "Produktibidad",
    description: "Praktikal na focus routines — deep work, time-boxing — walang walang-kwentang motivation.",
    intro: "Konkretong tactics para sa deep work at pagsisimula.",
    pillar: { path: "/body-doubling", label: "body doubling" },
  },
  adhd: {
    id: "adhd",
    label: "ADHD at focus",
    description: "Strategies para sa ADHD brain — body doubling, external structure.",
    intro: "Praktikal na tala tungkol sa task initiation at focus scaffolding.",
    pillar: { path: "/body-doubling", label: "body doubling para sa ADHD" },
  },
  exams: {
    id: "exams",
    label: "Board exam at pag-aaral",
    description: "Study sessions para sa PNLE, LET, UPCAT, licensure — nag-aaral mag-isa.",
    intro: "Tactics para sa review blocks at mock exam recovery.",
    pillar: { path: "/study-with-me", label: "study with me online" },
  },
  loneliness: {
    id: "loneliness",
    label: "Kalungkutan",
    description: "Mag-isang pag-aaral — at paano tumulong ang quiet co-presence.",
    intro: "Para sa nag-grind mag-isa sa bahay.",
    pillar: { path: "/virtual-coworking", label: "virtual coworking" },
  },
  remote: {
    id: "remote",
    label: "Remote at BPO",
    description: "Session design para sa BPO, VA, freelancer sa Pilipinas.",
    intro: "Realistiko sa shift, clients, at WFH distractions.",
    pillar: { path: "/virtual-coworking", label: "virtual coworking" },
  },
};

export function categoryLabelFil(id?: string): string {
  return (
    (id && CATEGORIES_FIL[id as CategoryId]?.label) ||
    CATEGORIES_FIL.productivity.label
  );
}

export function categoryMetaFil(id?: string): CategoryMetaFil {
  return (id && CATEGORIES_FIL[id as CategoryId]) || CATEGORIES_FIL.productivity;
}
