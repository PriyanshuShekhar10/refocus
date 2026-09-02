/**
 * Tagalog/Filipino blog niches for /fil/blog auto-publishing.
 * Exam topics are Philippines-specific — not India/Indonesia/Vietnam exams.
 */

export const CATEGORIES_FIL = {
  productivity: {
    id: "productivity",
    label: "Produktibidad",
    pillar: { path: "/body-doubling", label: "body doubling" },
    audience:
      "mga Pilipino na gusto ng praktikal na focus routines — deep work, time-boxing, simula ng task — madalas naghahanap ng accountability o virtual focus room",
    voice:
      "malinaw, konkretong Tagalog/Filipino (natural, hindi stiff translation). Banggitin ang problem sa unang paragraph. Body doubling kung relevant.",
    mustInclude:
      "kahit isang numbered routine o tactic na pwede subukan ngayong araw",
    avoid: "walang kwentang motivation, pekeng stats, JEE, UPSC, UTBK, THPT",
    topics: [
      "body doubling para sa produktibidad: magtrabaho katabi ng iba para talagang magsimula",
      "gumawa ng personal focus room sa bahay para sa accountability",
      "simulan ang 50-minutong deep work block kapag laging bumubukas ng bagong tab",
      "time-boxing sa hapon pagkatapos puno ng meeting ang umaga",
      "bakit nakaka-stuck ang open-ended to-do list — at 3-item na kapalit",
      "protektahan ang unang focus hour pagkagising",
    ],
  },

  adhd: {
    id: "adhd",
    label: "ADHD at focus",
    pillar: { path: "/body-doubling", label: "body doubling para sa ADHD" },
    audience:
      "mga may ADHD o katulad na struggle sa focus — nahihiya sa 'mag-try harder lang' — madalas naghahanap ng body doubling",
    voice:
      "empatiko at praktikal. Hindi medical advice. Acknowledge executive dysfunction.",
    mustInclude:
      "kahit isang body doubling o external structure tactic na hindi umaasa sa willpower",
    avoid: "cure language, stigma, ADHD superpower clichés",
    topics: [
      "body doubling para sa ADHD: bakit nagbabago ang simula kapag may kasama",
      "task initiation paralysis: liitan ang unang hakbang",
      "hiya pagkatapos ng araw na sayang — restart nang walang total reset",
      "timer bilang external working memory",
      "accountability nang walang pressure sa study session",
    ],
  },

  exams: {
    id: "exams",
    label: "Board exam at pag-aaral",
    pillar: { path: "/study-with-me", label: "study with me online" },
    audience:
      "estudyante at board exam reviewees sa Pilipinas — PNLE, LET, CPA, UPCAT, licensure — nag-aaral mag-isa, naghahanap ng study with me",
    voice:
      "Philippines exam context: PNLE, LET, UPCAT, board exam, licensure. Hindi Indian o Indonesian exams.",
    mustInclude:
      "banggitin ang isang tunay na Philippine exam context at isang konkretong study session tactic",
    avoid: "JEE, UPSC, NEET, UTBK, SNBT, THPT; rank guarantees; coaching ads",
    topics: [
      "study with me online: daily routine para sa board exam review",
      "PNLE review: 50-minutong focus block na talagang magsisimula",
      "pagkatapos ng mock exam na mababa — structure nang hindi buong araw sayang",
      "UPCAT prep: tatlong target ngayong araw kapag overwhelming ang syllabus",
      "LET review sa gabi habang tulog na ang lahat",
      "active recall vs passive rereading para sa licensure exam",
    ],
  },

  loneliness: {
    id: "loneliness",
    label: "Kalungkutan at mag-isang pag-aaral",
    pillar: { path: "/virtual-coworking", label: "virtual coworking" },
    audience:
      "estudyante at remote workers sa PH na nalulungkot mag-isa — gusto ng library energy",
    voice:
      "tapat tungkol sa isolation. Quiet co-presence, hindi pilit mag-usap.",
    mustInclude:
      "pag-iba ng kailangan ng company vs kailangan ng usapan — at isang paraan ng co-presence",
    avoid: "toxic positivity, 'sumali ka na lang sa Discord'",
    topics: [
      "virtual coworking para sa nag-aaral o nagtatrabaho mag-isa buong araw",
      "mag-isang review sa bahay nang buwan-buwan",
      "bakit mas focused sa café — alternative kapag hindi makalabas",
      "tahimik na co-study vs group na nauuwi sa chismisan",
    ],
  },

  remote: {
    id: "remote",
    label: "Remote work at BPO",
    pillar: { path: "/virtual-coworking", label: "virtual coworking" },
    audience:
      "BPO agents, VA sa Manila/Cebu, freelancers na may US/EU clients — night shift, WFH",
    voice:
      "realistiko sa shift, clients, distractions sa bahay. Virtual coworking bilang session structure.",
    mustInclude:
      "Philippines remote/BPO scenario at konkretong session structure",
    avoid: "hustle culture, rise and grind",
    topics: [
      "BPO night shift: protektahan ang focus block bago ang shift",
      "VA sa Pilipinas: deep work bago mag-overlap sa US client",
      "WFH sa condo: i-recreate ang office energy nang walang commute",
      "freelancer: billable focus block kapag laging on-call",
      "async Slack culture: isang tunay na quiet hour",
    ],
  },
};

export const CATEGORY_IDS_FIL = Object.keys(CATEGORIES_FIL);

export function getCategoryFil(id) {
  const key = String(id || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  return CATEGORIES_FIL[key] || null;
}
