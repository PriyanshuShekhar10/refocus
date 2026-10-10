import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { SITE_URL } from "../lib/seo";
import { categoryLabel } from "../lib/categories";

/**
 * /llms-full.txt — a plain-text index of the whole site for AI assistants:
 * what Refocus is, the key pages with one-line summaries, and every English
 * post with its summary and FAQ answers. Regenerated on every build.
 */
const PAGES: [path: string, title: string, summary: string][] = [
  ["/", "Refocus", "Free virtual co-working: book a timed focus session, get paired with a partner, share goals, work on camera with a synced timer, check in at the end."],
  ["/features", "Features", "Everything Refocus does: partner matching, focus sessions, quiet mode, friends and accountability, community, session history and stats."],
  ["/pricing", "Pricing", "Refocus is free to start, with no credit card and no session cap."],
  ["/free", "Free focus sessions", "How to get free online focus sessions with an accountability partner."],
  ["/body-doubling", "Body doubling online", "What body doubling is, why working alongside someone helps focus (including for ADHD), and how to do it online for free."],
  ["/virtual-coworking", "Virtual coworking", "How virtual coworking works for remote workers and freelancers, and how to use timed sessions to stay accountable."],
  ["/study-with-me", "Study with me online", "Live study-with-me sessions with a real partner instead of a pre-recorded video, for exams and coursework."],
  ["/focus-room", "Online focus room", "A quiet online room to focus in with another person, using timed sessions."],
  ["/study-partner", "Study partner", "How to find a quiet online study partner for accountability without chatting."],
  ["/focusmate-alternative", "Refocus vs Focusmate", "A free Focusmate alternative: how Refocus compares on price, session lengths and matching."],
  ["/flown-alternative", "Refocus vs FLOWN", "How Refocus compares with FLOWN for guided and partner focus sessions."],
  ["/cofocus-alternative", "Refocus vs Cofocus", "How Refocus compares with Cofocus for co-working sessions."],
  ["/studystream-alternative", "Refocus vs StudyStream", "How Refocus compares with StudyStream for studying with others online."],
  ["/about", "About Refocus", "Who builds Refocus and why."],
  ["/support", "Help and support", "Answers to common questions about accounts, sessions and the app."],
];

export const GET: APIRoute = async () => {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => +new Date(b.data.pubDate) - +new Date(a.data.pubDate),
  );

  const lines: string[] = [
    "# Refocus — full content index",
    "",
    "> Refocus is a free virtual co-working and body doubling platform. You book a timed focus session, get paired with an accountability partner, share your goal, work side by side on camera with a synced timer, and check in at the end. Built for students, remote workers, people with ADHD, and anyone who struggles to start alone.",
    "",
    `Sign up free: https://dashboard.refocus.co.in/auth/sign-up · Contact: hello@refocus.co.in`,
    "",
    "## Key pages",
    "",
    ...PAGES.map(([path, title, summary]) => `- [${title}](${SITE_URL}${path === "/" ? "" : path}): ${summary}`),
    "",
    `## Blog posts (${posts.length})`,
    "",
  ];

  for (const post of posts) {
    const d = post.data;
    lines.push(`### [${d.title}](${SITE_URL}/blog/${post.id})`);
    lines.push(
      `${new Date(d.pubDate).toISOString().slice(0, 10)} · ${categoryLabel(d.category)} · by ${d.author}`,
    );
    lines.push("", d.description);
    for (const f of d.faq) {
      lines.push("", `Q: ${f.q}`, `A: ${f.a}`);
    }
    lines.push("");
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
