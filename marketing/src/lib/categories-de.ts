import type { CategoryId } from "./categories";

export type CategoryMetaDe = {
  id: CategoryId;
  label: string;
  description: string;
  intro: string;
  pillar: { path: string; label: string };
};

export const CATEGORIES_DE: Record<CategoryId, CategoryMetaDe> = {
  productivity: {
    id: "productivity",
    label: "Produktivität",
    description:
      "Konkrete Fokus-Routinen — Deep Work, Time-Boxing — ohne leere Motivation.",
    intro: "Taktiken für Deep Work und das echte Anfangen.",
    pillar: { path: "/body-doubling", label: "Body Doubling" },
  },
  adhd: {
    id: "adhd",
    label: "ADHS & Fokus",
    description:
      "Strategien für ADHS-Gehirne — Body Doubling, externe Struktur.",
    intro: "Pragmatische Notizen zu Executive Dysfunction und Starthemmung.",
    pillar: { path: "/body-doubling", label: "Body Doubling bei ADHS" },
  },
  exams: {
    id: "exams",
    label: "Prüfungen & Lernen",
    description:
      "Lernsessions für Abitur, Uni und Staatsexamen — auch allein.",
    intro: "Taktiken für Übungsblöcke und nach schlechten Probeklausuren.",
    pillar: { path: "/study-with-me", label: "gemeinsam online lernen" },
  },
  loneliness: {
    id: "loneliness",
    label: "Einsamkeit",
    description: "Allein lernen — und was stille Co-Präsenz helfen kann.",
    intro: "Für alle, die monatelang zu Hause grindet.",
    pillar: { path: "/virtual-coworking", label: "virtuelles Coworking" },
  },
  remote: {
    id: "remote",
    label: "Remote & Freelance",
    description: "Session-Design für Freelancer und Homeoffice im DACH-Raum.",
    intro: "Pragmatisch zu Meetings, Kunden und Ablenkung zu Hause.",
    pillar: { path: "/virtual-coworking", label: "virtuelles Coworking" },
  },
};

export function categoryLabelDe(id?: string): string {
  return (
    (id && CATEGORIES_DE[id as CategoryId]?.label) ||
    CATEGORIES_DE.productivity.label
  );
}

export function categoryMetaDe(id?: string): CategoryMetaDe {
  return (id && CATEGORIES_DE[id as CategoryId]) || CATEGORIES_DE.productivity;
}
