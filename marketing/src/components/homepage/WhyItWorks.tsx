import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";

type Reason = { num: string; title: string; text: string; href?: string };

const REASONS: Reason[] = [
  {
    num: "01",
    title: "Body doubling",
    href: "/body-doubling",
    text: "The presence of another working human reliably keeps you on task — there's research and there's your own experience.",
  },
  {
    num: "02",
    title: "Stated intent",
    text: "Saying out loud what you'll do in the next 50 minutes — to one other person — makes the commitment real.",
  },
  {
    num: "03",
    title: "A hard stop",
    text: "The timer ends. So does the session. That's the magic — the work has a shape.",
  },
];

export function WhyItWorks() {
  return (
    <section className={`${styles.block} ${styles.blockAlt}`} id="community">
      <div className={styles.wrap}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.eyebrow}>03 — Why it works</span>
          <h2 className={styles.sectionTitle}>
            Showing up is the hard part. Refocus makes it easy.
          </h2>
        </Reveal>

        <div className={styles.whyGrid}>
          {REASONS.map((r, i) => (
            <Reveal
              key={r.num}
              delayMs={i * 60}
              className={styles.whyCell}
            >
              <div className={styles.whyNum}>{r.num}</div>
              <h3 className={styles.whyTitle}>
                {r.href ? <a href={r.href}>{r.title}</a> : r.title}
              </h3>
              <p className={styles.whyText}>{r.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
