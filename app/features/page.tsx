import Link from "next/link";
import { Shell, MinimalNav, designStyles } from "@/components/design";

const FEATURES = [
  {
    eyebrow: "Sessions",
    title: "Three lengths, one ritual.",
    body: "25-minute sprints for quick wins, 50-minute deep-work blocks for the real thing, and 75-minute marathons for writing or research. Pick a length, start the timer.",
  },
  {
    eyebrow: "Focus mode",
    title: "Both mics muted. Both cameras off.",
    body: "Focus mode disables audio and video by default. You're present, not performing. Unmute at the end of the session to check in if you want.",
  },
  {
    eyebrow: "Synced timers",
    title: "Two clocks, one rhythm.",
    body: "When your partner starts, you start. Breaks land together. No coordination overhead — just sit down and the timer takes care of the structure.",
  },
  {
    eyebrow: "Friends & requests",
    title: "Work with the people you focus best with.",
    body: "Send friend requests. Send session requests. See who's free, who's in a session, and how long is left on their timer.",
  },
  {
    eyebrow: "Global chat",
    title: "A quiet lounge between sessions.",
    body: "Drop into the global chat between rooms. Say hi, find a partner for the next slot, or just lurk while you wait for the timer to tick down.",
  },
  {
    eyebrow: "Smart scheduler",
    title: "AI that picks a time, not a meeting.",
    body: "Tell us when you'd like to focus. We'll find a partner whose calendar matches and a slot that works for both of you.",
  },
];

export default function FeaturesPage() {
  return (
    <Shell>
      <MinimalNav
        ctas={[
          { label: "Home", href: "/", variant: "quiet" },
          { label: "Start a session", href: "/auth/sign-up", variant: "primary" },
        ]}
      />

      <main>
        <section style={{ padding: "80px 0 56px" }}>
          <div className={designStyles.wrap}>
            <span className={designStyles.eyebrow}>Features</span>
            <h1
              className={designStyles.pageTitle}
              style={{ fontSize: "clamp(40px, 6vw, 72px)", maxWidth: "16ch" }}
            >
              Everything Refocus does, in one page.
            </h1>
            <p
              className={designStyles.pageSub}
              style={{ fontSize: 18, marginTop: 22 }}
            >
              Nothing you don&apos;t need. A timer, a partner, a room. The
              rest is just out of the way.
            </p>
          </div>
        </section>

        <section
          style={{ padding: "80px 0", borderTop: "1px solid var(--line)" }}
        >
          <div className={designStyles.wrap}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 14,
              }}
            >
              {FEATURES.map((f, i) => (
                <article
                  key={f.title}
                  className={designStyles.card}
                  style={{ minHeight: 200 }}
                >
                  <span
                    className={designStyles.eyebrow}
                    style={{ marginBottom: 18, display: "inline-flex" }}
                  >
                    {String(i + 1).padStart(2, "0")} — {f.eyebrow}
                  </span>
                  <h3
                    className={designStyles.sectionTitle}
                    style={{ fontSize: 22, marginTop: 14, marginBottom: 10 }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      color: "var(--ink-soft)",
                      fontSize: 15,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {f.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{
            padding: "120px 0",
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
              Sit down. Start the timer.
              <br />
              Get the thing done.
            </h2>
            <p
              className={designStyles.pageSub}
              style={{ marginInline: "auto", textAlign: "center" }}
            >
              Free to start. One click to your first session.
            </p>
            <div
              style={{
                marginTop: 32,
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/auth/sign-up"
                className={`${designStyles.btn} ${designStyles.btnPrimary} ${designStyles.btnLg}`}
              >
                Start focusing
              </Link>
              <Link
                href="/"
                className={`${designStyles.btn} ${designStyles.btnGhost} ${designStyles.btnLg}`}
              >
                Back to home
              </Link>
            </div>
          </div>
        </section>

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
