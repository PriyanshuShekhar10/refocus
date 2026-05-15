import Link from "next/link";
import { Users, Heart, Zap, Globe } from "lucide-react";
import { Shell, MinimalNav, designStyles } from "@/components/design";

const values = [
  {
    icon: Users,
    title: "People first",
    description:
      "We build for meaningful connection. Our team works closely, supports each other, and grows together.",
  },
  {
    icon: Heart,
    title: "Purpose driven",
    description:
      "Every feature we ship helps someone focus and finish what they sit down to do. Your work matters.",
  },
  {
    icon: Zap,
    title: "Move fast",
    description:
      "We ship early, learn fast, and iterate. You'll have real impact from day one.",
  },
  {
    icon: Globe,
    title: "Remote-friendly",
    description:
      "Work from anywhere. We're distributed, async-first, and built around long focus blocks.",
  },
];

export default function CareerPage() {
  return (
    <Shell>
      <MinimalNav
        ctas={[
          { label: "Home", href: "/", variant: "quiet" },
          { label: "Start focusing", href: "/auth/sign-up", variant: "primary" },
        ]}
      />

      <main>
        {/* Hero */}
        <section style={{ padding: "80px 0 56px" }}>
          <div className={designStyles.wrap}>
            <span className={designStyles.eyebrow}>We&apos;re hiring</span>
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

        {/* Values */}
        <section
          style={{
            padding: "80px 0",
            borderTop: "1px solid var(--line)",
          }}
        >
          <div className={designStyles.wrap}>
            <div style={{ marginBottom: 48 }}>
              <span className={designStyles.eyebrow}>01 — Why Refocus</span>
              <h2
                className={designStyles.pageTitle}
                style={{ fontSize: "clamp(28px, 4vw, 44px)" }}
              >
                What you can expect.
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {values.map((v) => (
                <article
                  key={v.title}
                  className={designStyles.card}
                  style={{ minHeight: 180 }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "var(--accent-soft)",
                      color: "color-mix(in oklab, var(--accent) 70%, var(--ink))",
                      marginBottom: 16,
                    }}
                  >
                    <v.icon size={18} />
                  </div>
                  <h3
                    className={designStyles.sectionTitle}
                    style={{ fontSize: 18, marginBottom: 6 }}
                  >
                    {v.title}
                  </h3>
                  <p
                    style={{
                      color: "var(--ink-soft)",
                      fontSize: 14,
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    {v.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Open roles */}
        <section
          style={{ padding: "80px 0", borderTop: "1px solid var(--line)" }}
        >
          <div className={designStyles.wrap}>
            <span className={designStyles.eyebrow}>02 — Open roles</span>
            <h2
              className={designStyles.pageTitle}
              style={{ fontSize: "clamp(28px, 4vw, 44px)" }}
            >
              Quiet, for now.
            </h2>
            <p
              className={designStyles.pageSub}
              style={{ fontSize: 16, marginTop: 16 }}
            >
              We&apos;re preparing to grow. Check back soon, or drop us a note
              and we&apos;ll reach out when we open applications.
            </p>
            <div style={{ marginTop: 28 }}>
              <span
                className={designStyles.tag}
                style={{ padding: "8px 14px" }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--accent)",
                  }}
                />
                Roles opening soon
              </span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            padding: "100px 0",
            borderTop: "1px solid var(--line)",
            textAlign: "center",
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
                href="mailto:careers@refocus.app"
                className={`${designStyles.btn} ${designStyles.btnPrimary} ${designStyles.btnLg}`}
              >
                careers@refocus.app
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={designStyles.footer}>
          <div className={`${designStyles.wrap} ${designStyles.footInner}`}>
            <Link href="/" className={designStyles.brand}>
              <span className={designStyles.brandMark} aria-hidden="true" />
              <span>Refocus</span>
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
  );
}
