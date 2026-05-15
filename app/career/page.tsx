import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Shell, designStyles } from "@/components/design";
import { Logo } from "@/assets/exports";
import { LandingLightLock } from "@/components/landing-light-lock";
import Navbar from "@/components/navbar/navbar";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();
const careerPath = "/career";

export const metadata: Metadata = {
  title: "Careers — Refocus",
  description:
    "Join Refocus to build focused work tools that help people show up and ship. Explore fresher-friendly roles and internships.",
  alternates: {
    canonical: careerPath,
  },
  openGraph: {
    title: "Careers — Refocus",
    description:
      "Explore fresher-friendly engineering and operations roles at Refocus.",
    url: `${siteUrl}${careerPath}`,
    siteName: "Refocus",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Careers at Refocus",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Careers — Refocus",
    description:
      "Explore fresher-friendly engineering and operations roles at Refocus.",
    images: ["/twitter-image.png"],
  },
};

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

export default function CareerPage() {
  const careerJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Careers — Refocus",
    description:
      "Explore fresher-friendly engineering and operations roles at Refocus.",
    url: `${siteUrl}${careerPath}`,
  };

  const jobPostingJsonLd = openRoles.map((role) => ({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: role.title,
    description: `${role.summary} Looking for: ${role.skills}`,
    hiringOrganization: {
      "@type": "Organization",
      name: "Refocus",
      sameAs: siteUrl,
    },
    employmentType: role.mode.includes("Internship") ? "INTERN" : "FULL_TIME",
    jobLocationType: "TELECOMMUTE",
    applicantLocationRequirements: {
      "@type": "Country",
      name: "India",
    },
    directApply: false,
    url: `${siteUrl}${careerPath}`,
  }));

  return (
    <LandingLightLock>
      <Shell>
        <Navbar marketingHome />

      <main
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--accent-soft) 35%, var(--bg)) 0%, var(--bg) 24%)",
        }}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(careerJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }}
        />
        {/* Hero */}
        <section
          style={{
            padding: "132px 0 64px",
            borderBottom: "1px solid var(--line-soft)",
            background: "var(--hero-gradient)",
          }}
        >
          <div className={designStyles.wrap}>
            <span
              className={designStyles.eyebrow}
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
              className={designStyles.pageTitle}
              style={{ fontSize: "clamp(40px, 6vw, 72px)", maxWidth: "14ch" }}
            >
              Help people find focus,
              <br />
              together.
            </h1>
            <p
              className={designStyles.pageSub}
              style={{ fontSize: 18, marginTop: 22 }}
            >
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
          <div className={designStyles.wrap}>
            <span className={designStyles.eyebrow}>01 — Open roles</span>
            <h2
              className={designStyles.pageTitle}
              style={{ fontSize: "clamp(28px, 4vw, 44px)" }}
            >
              Roles we are actively hiring for.
            </h2>
            <p
              className={designStyles.pageSub}
              style={{ fontSize: 16, marginTop: 16 }}
            >
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
                  className={designStyles.card}
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
                    <h3
                      className={designStyles.sectionTitle}
                      style={{ fontSize: 18 }}
                    >
                      {role.title}
                    </h3>
                    <span className={designStyles.tag}>{role.level}</span>
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
              className={designStyles.card}
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
                <a className={designStyles.link} href="mailto:hello@refocus.co.in">
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
          <div className={designStyles.wrap}>
            <h2
              className={designStyles.pageTitle}
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
            <p
              className={designStyles.pageSub}
              style={{ marginInline: "auto", textAlign: "center" }}
            >
              Drop us a line — we&apos;ll reach out when applications open.
            </p>
            <div style={{ marginTop: 32 }}>
              <a
                href="mailto:hello@refocus.co.in"
                className={`${designStyles.btn} ${designStyles.btnPrimary} ${designStyles.btnLg}`}
              >
                hello@refocus.co.in
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={designStyles.footer}>
          <div className={`${designStyles.wrap} ${designStyles.footInner}`}>
            <Link href="/" className={designStyles.brand}>
              <Image
                src={Logo}
                alt="Refocus"
                className="h-7 w-auto dark:invert dark:brightness-0"
              />
            </Link>
            <div style={{ display: "flex", gap: 28 }}>
              <Link href="/">Home</Link>
              <Link href="/features">Features</Link>
              <Link href="/career">Careers</Link>
            </div>
            <div className={designStyles.footMeta}>made for deep work</div>
          </div>
        </footer>
        </main>
      </Shell>
    </LandingLightLock>
  );
}
