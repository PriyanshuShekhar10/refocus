/**
 * German blog niches for /de/blog auto-publishing.
 * Exam topics are Germany/DACH-specific — not India/SEA exams.
 */

export const CATEGORIES_DE = {
  productivity: {
    id: "productivity",
    label: "Produktivität",
    pillar: { path: "/body-doubling", label: "Body Doubling" },
    audience:
      "Menschen im DACH-Raum, die konkrete Fokus-Routinen brauchen — Deep Work, Time-Boxing, Anfangen — oft mit Accountability oder virtuellem Fokusraum",
    voice:
      "klar, konkret, natürliches Deutsch (kein steifes Maschinen-Deutsch). Problem im ersten Absatz. Body Doubling, wenn es passt.",
    mustInclude:
      "mindestens eine nummerierte Routine oder Taktik, die man heute noch ausprobieren kann",
    avoid: "leere Motivation, erfundene Zahlen, JEE, UPSC, UTBK, PNLE, THPT",
    topics: [
      "Body Doubling für Produktivität: neben jemandem arbeiten, um wirklich anzufangen",
      "Zuhause einen Fokusraum für Accountability schaffen",
      "einen 50-Minuten-Deep-Work-Block starten, wenn man ständig neue Tabs öffnet",
      "Time-Boxing am Nachmittag nach einem Meeting-vollen Vormittag",
      "warum endlose To-do-Listen blockieren — und der Wechsel zu 3 Punkten",
      "die erste Fokus-Stunde nach dem Aufwachen schützen",
    ],
  },

  adhd: {
    id: "adhd",
    label: "ADHS & Fokus",
    pillar: { path: "/body-doubling", label: "Body Doubling bei ADHS" },
    audience:
      "Menschen mit ADHS oder ähnlichen Fokusproblemen — frustriert von „streng dich mehr an“ — oft auf der Suche nach Body Doubling",
    voice:
      "empathisch und pragmatisch. Keine medizinische Beratung. Executive Dysfunction anerkennen.",
    mustInclude:
      "mindestens eine Body-Doubling- oder externe Struktur-Taktik, die nicht auf Willenskraft baut",
    avoid: "Heilungsversprechen, Stigma, ADHS-Superpower-Klischees",
    topics: [
      "Body Doubling bei ADHS: warum eine andere Person im Raum den Start verändert",
      "Starthemmung: den ersten Schritt verkleinern",
      "Scham nach einem verlorenen Lerntag — Neustart ohne Total-Reset",
      "Timer als externes Arbeitsgedächtnis",
      "Accountability ohne Druck für ADHS-Lernsessions",
    ],
  },

  exams: {
    id: "exams",
    label: "Prüfungen & Lernen",
    pillar: { path: "/study-with-me", label: "gemeinsam online lernen" },
    audience:
      "Schüler:innen und Studierende in DE/AT/CH — Abitur, Uni-Klausuren, Staatsexamen — oft monatelang allein am Schreibtisch",
    voice:
      "DACH-Prüfungskontext: Abitur, Uni, Staatsexamen, Numerus Clausus. Keine indischen, indonesischen oder philippinischen Prüfungen.",
    mustInclude:
      "mindestens einen DACH-Prüfungskontext und eine konkrete Session-Taktik",
    avoid: "JEE, UPSC, NEET, UTBK, SNBT, PNLE, THPT; Rank-Versprechen; Nachhilfe-Werbung",
    topics: [
      "Study-with-me online: tägliche Abitur-Lernroutine",
      "50-Minuten-Block nach einer schlechten Probeklausur — ohne den Tag abzuschreiben",
      "drei Tagesziele wenn der Uni-Stoffberg zu groß wirkt",
      "Active Recall statt passives Wiederlesen für Klausuren",
      "Lernen spät abends wenn alle schlafen — fokussiert bleiben ohne Scrollen",
      "Staatsexamen: timed Übungsblöcke mit klarer Agenda",
    ],
  },

  loneliness: {
    id: "loneliness",
    label: "Allein lernen & Einsamkeit",
    pillar: { path: "/virtual-coworking", label: "virtuelles Coworking" },
    audience:
      "Menschen die remote lernen/arbeiten und die Bibliotheks-Energie vermissen",
    voice:
      "ehrlich über Einsamkeit. Stille Co-Präsenz, kein Zwang zum Smalltalk.",
    mustInclude:
      "unterscheide Bedarf nach Gesellschaft vs. Gespräch — und einen Weg zu Co-Präsenz",
    avoid: "toxische Positivität, „geh einfach auf Discord“",
    topics: [
      "virtuelles Coworking für alle, die den ganzen Tag allein lernen oder arbeiten",
      "Einsamkeit beim monatelangen Lernen zu Hause",
      "warum Fokus im Café besser klappt — und Alternativen ohne Ausgehen",
      "stilles Co-Lernen vs. gesellige Lerngruppe",
    ],
  },

  remote: {
    id: "remote",
    label: "Remote & Freelance",
    pillar: { path: "/virtual-coworking", label: "virtuelles Coworking" },
    audience:
      "Freelancer und Remote-Workers in DE/AT/CH — Homeoffice, async Clients, globale Zeitzonen",
    voice:
      "pragmatisch zu Kalender, Kunden und Ablenkung zu Hause. Virtuelles Coworking als Session-Struktur.",
    mustInclude:
      "ein DACH-Remote/Freelance-Szenario und eine konkrete Session-Struktur",
    avoid: "Hustle-Culture",
    topics: [
      "virtuelles Coworking für Freelancer die allein arbeiten",
      "Homeoffice-Morgen der in E-Mails versinkt bevor Deep Work beginnt",
      "billable Blöcke wenn jede Stunde unterbrochen werden kann",
      "Arbeiten aus dem Einzimmerappartement ohne richtigen Schreibtisch",
      "Zeitzone mit internationalen Clients — Fokus-Sessions in ruhigen Stunden",
      "Remote in Berlin/München/Wien: Büro-Energie ohne Pendeln",
    ],
  },
};

export const CATEGORY_IDS_DE = Object.keys(CATEGORIES_DE);

export function getCategoryDe(id) {
  const key = String(id || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  return CATEGORIES_DE[key] || null;
}
