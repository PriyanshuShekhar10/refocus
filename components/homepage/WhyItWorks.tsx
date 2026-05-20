import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";

const REASONS = [
  {
    num: "01",
    title: "Body doubling",
    text: "Another person present. Easier to stay on task.",
  },
  {
    num: "02",
    title: "Stated intent",
    text: "Say the next task out loud. Commitment rises.",
  },
  {
    num: "03",
    title: "A hard stop",
    text: "Timer ends the block. Start and stop are clear.",
  },
];

export function WhyItWorks() {
  return (
    <section className={styles.block} id="community">
      <div className={styles.wrap}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.eyebrow}>03 — Why it works</span>
          <h2 className={styles.sectionTitle}>
            Small structure. Real output.
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
              <h3 className={styles.whyTitle}>{r.title}</h3>
              <p className={styles.whyText}>{r.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
