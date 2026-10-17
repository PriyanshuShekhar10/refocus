import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";

type Mode = {
  title: string;
  body: string;
  window: string;
};

const MODES: Mode[] = [
  {
    title: "focus mode",
    body: "say what you're working on, then get to work. your partner stays there with you, conversation optional.",
    window: "focus-mode.app",
  },
  {
    title: "synced timers",
    body: "two clocks, one rhythm. start together, break together, finish together.",
    window: "synced-timers.app",
  },
  {
    title: "focus with friends",
    body: "save the people you work well with and invite them directly to your next session.",
    window: "friends.app",
  },
  {
    title: "find someone to focus with",
    body: "drop into the lounge, see who's around, and find a partner for your next session.",
    window: "lounge.app",
  },
];

export function Modes() {
  return (
    <section className={styles.block} id="how">
      <div className={styles.wrap}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.eyebrow}>the experience</span>
          <h2 className={styles.sectionTitle}>
            focus together. without meetings or noise.
          </h2>
          <p className={styles.sectionSub}>
            work quietly with someone, no forced conversations.
          </p>
        </Reveal>

        <div className={styles.modesGrid}>
          {MODES.map((m, i) => (
            <Reveal key={m.title} delayMs={i * 60} className={styles.winCard}>
              <div className={styles.winTitlebar}>
                <span className={styles.winDot} />
                <span className={styles.winDot} />
                <span className={styles.winLabel}>{m.window}</span>
              </div>
              <div className={`${styles.winBody} ${styles.modeCardBody}`}>
                <h3>{m.title}</h3>
                <p>{m.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
