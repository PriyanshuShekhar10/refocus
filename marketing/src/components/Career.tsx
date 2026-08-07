import design from "./design.module.css";
import Navbar from "./Navbar";
import { url } from "../lib/config";

const openRoles = [
  {
    title: "Frontend Engineer (Fresher)",
    level: "0-1 years",
    mode: "Remote · Full-time",
    summary:
      "Build polished, accessible product interfaces with React and Next.js. Ideal for early-career developers who care about UX and clean code.",
    skills:
      "JavaScript/TypeScript basics, React fundamentals, CSS/Tailwind comfort, willingness to ship and learn quickly.",
  },
  {
    title: "Full-Stack Engineer (Junior)",
    level: "0-2 years",
    mode: "Remote · Full-time",
    summary:
      "Work across API and product features, from session flows to reliability improvements. Great fit for strong freshers with project experience.",
    skills:
      "Node.js/Next.js basics, REST APIs, database fundamentals, debugging mindset, ownership of features end-to-end.",
  },
  {
    title: "Community & Support Associate (Fresher)",
    level: "0-1 years",
    mode: "Remote · Full-time",
    summary:
      "Support users, guide onboarding, and improve community quality. Best for clear communicators who enjoy helping people stay productive.",
    skills:
      "Written communication, empathy, issue triage, light product tooling familiarity, strong follow-through.",
  },
  {
    title: "Product Operations Intern",
    level: "Final year / Recent graduate",
    mode: "Remote · Internship",
    summary:
      "Help run experiments, document workflows, and support launch operations. Strong path into product, ops, or growth roles.",
    skills:
      "Structured thinking, spreadsheet comfort, attention to detail, ability to summarize insights clearly.",
  },
];

export default function Career() {
  return (
    <div className={design.shell}>
      <Navbar />

      <main
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--accent-soft) 35%, var(--bg)) 0%, var(--bg) 24%)",
        }}
      >
        {/* Hero */}
        <section
          style={{
            padding: "132px 0 64px",
            borderBottom: "1px solid var(--line-soft)",
            background: "var(--hero-gradient)",
          }}
        >
          <div className={design.wrap}>
            <span
              className={design.eyebrow}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "color-mix(in oklab, var(--accent-soft) 70%, transparent)",
                border: "1px solid color-mix(in oklab, var(--accent) 24%, var(--line))",
              }}
            >
              We&apos;re hiring
            </span>
            <h1
              className={design.pageTitle}
              style={{ fontSize: "clamp(40px, 6vw, 72px)", maxWidth: "14ch" }}
            >
              Help people find focus,
              <br />
              together.
            </h1>
            <p className={design.pageSub} style={{ fontSize: 18, marginTop: 22 }}>
              Join a small, deliberate team building the quiet future of focused
              work. We&apos;re shaping a place where people show up, sit down,
              and finish what they started.
            </p>
          </div>
        </section>

        {/* Open roles */}
        <section
          style={{
            padding: "80px 0",
            borderTop: "1px solid var(--line)",
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--accent-soft) 22%, transparent) 0%, transparent 60%)",
          }}
        >
          <div className={design.wrap}>
            <span className={design.eyebrow}>01 — Open roles</span>
            <h2 className={design.pageTitle} style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>
              Roles we are actively hiring for.
            </h2>
            <p className={design.pageSub} style={{ fontSize: 16, marginTop: 16 }}>
              Fresher-friendly openings across engineering and operations.
              Instead of an application form, email your resume and a short
              introduction to <strong>hello@refocus.co.in</strong>.
            </p>

            <div
              style={{
                marginTop: 28,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {openRoles.map((role) => (
                <article
                  key={role.title}
                  className={design.card}
                  style={{
                    borderColor: "color-mix(in oklab, var(--accent) 20%, var(--line))",
                    background:
                      "linear-gradient(180deg, color-mix(in oklab, var(--accent-soft) 35%, var(--card)) 0%, var(--card) 100%)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <h3 className={design.sectionTitle} style={{ fontSize: 18 }}>
                      {role.title}
                    </h3>
                    <span className={design.tag}>{role.level}</span>
                  </div>
                  <p
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: "var(--ink-mute)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {role.mode}
                  </p>
                  <p
                    style={{
                      marginTop: 12,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--ink-soft)",
                    }}
                  >
                    {role.summary}
                  </p>
                  <p
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "var(--ink-mute)",
                    }}
                  >
                    <strong style={{ color: "var(--ink-soft)" }}>Looking for:</strong>{" "}
                    {role.skills}
                  </p>
                </article>
              ))}
            </div>

            <div
              className={design.card}
              style={{
                marginTop: 16,
                padding: 18,
                borderColor: "color-mix(in oklab, var(--accent) 30%, var(--line))",
                background:
                  "linear-gradient(180deg, color-mix(in oklab, var(--accent-soft) 45%, var(--card)) 0%, var(--card) 100%)",
              }}
            >
              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)" }}>
                To apply, mail{" "}
                <a className={design.link} href="mailto:hello@refocus.co.in">
                  hello@refocus.co.in
                </a>{" "}
                with your resume, portfolio/GitHub (if any), and the role title
                in the subject line.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            padding: "100px 0",
            borderTop: "1px solid var(--line)",
            textAlign: "center",
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--accent-soft) 26%, transparent) 0%, transparent 58%)",
          }}
        >
          <div className={design.wrap}>
            <h2
              className={design.pageTitle}
              style={{
                fontSize: "clamp(32px, 5vw, 56px)",
                margin: "0 auto",
                maxWidth: "18ch",
              }}
            >
              Want to be the
              <br />
              first to know?
            </h2>
            <p className={design.pageSub} style={{ marginInline: "auto", textAlign: "center" }}>
              Drop us a line — we&apos;ll reach out when applications open.
            </p>
            <div style={{ marginTop: 32 }}>
              <a
                href="mailto:hello@refocus.co.in"
                className={`${design.btn} ${design.btnPrimary} ${design.btnLg}`}
              >
                hello@refocus.co.in
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={design.footer}>
          <div className={`${design.wrap} ${design.footInner}`}>
            <a href="/" className={design.brand}>
              <img src="/logo.svg" alt="Refocus" style={{ height: 28, width: "auto" }} />
            </a>
            <div style={{ display: "flex", gap: 28 }}>
              <a href="/">Home</a>
              <a href={url("/features")}>Features</a>
              <a href="/career">Careers</a>
            </div>
            <div className={design.footMeta}>made for deep work</div>
          </div>
        </footer>
      </main>
    </div>
  );
}
