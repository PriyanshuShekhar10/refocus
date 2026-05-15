import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";

export function Stats() {
  return (
    <section className={styles.block}>
      <div className={styles.wrap}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.eyebrow}>04 — In numbers</span>
          <h2 className={styles.sectionTitle}>
            A quiet hum, every hour of the day.
          </h2>
        </Reveal>

        <div className={styles.stats}>
          <Reveal className={styles.stat}>
            <div className={styles.statNum}>412k</div>
            <div className={styles.statLabel}>Focused hours logged</div>
          </Reveal>
          <Reveal delayMs={60} className={styles.stat}>
            <div className={styles.statNum}>38</div>
            <div className={styles.statLabel}>
              Countries with active members
            </div>
          </Reveal>
          <Reveal delayMs={120} className={styles.stat}>
            <div className={styles.statNum}>
              94<span className={styles.statPct}>%</span>
            </div>
            <div className={styles.statLabel}>
              Of members finish what they sit down to do
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
