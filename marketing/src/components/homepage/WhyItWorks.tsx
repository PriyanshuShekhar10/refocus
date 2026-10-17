import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";

type Reason = { num: string; title: string; text: string; href?: string };

const REASONS: Reason[] = [
  {
    num: "01",
    title: "body doubling",
    href: "/body-doubling",
    text: "the presence of another working human reliably keeps you on task. there's research and there's your own experience.",
  },
  {
    num: "02",
    title: "stated intent",
    text: "saying out loud what you'll do in the next 50 minutes to one other person makes the commitment real.",
  },
  {
    num: "03",
    title: "a hard stop",
    text: "the timer ends. so does the session. that's the magic: the work has a shape.",
  },
];

export function WhyItWorks() {
  return (
    <section className={styles.block} id="community">
      <div className={styles.wrap}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.eyebrow}>why it works</span>
          <h2 className={styles.sectionTitle}>
            showing up is the hard part. refocus makes it easy.
          </h2>
        </Reveal>

        <div className={styles.whyInner}>
          <div className={styles.winCard}>
            <div className={styles.winTitlebar}>
              <span className={styles.winDot} />
              <span className={styles.winDot} />
              <span className={styles.winLabel}>notes.txt</span>
            </div>
            <div className={styles.whyBody}>
              {REASONS.map((r, i) => (
                <Reveal key={r.num} delayMs={i * 60} className={styles.whyRow}>
                  <span className={styles.whyNum}>{r.num}</span>
                  <div>
                    <h3 className={styles.whyTitle}>
                      {r.href ? <a href={r.href}>{r.title}</a> : r.title}
                    </h3>
                    <p className={styles.whyText}>{r.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
