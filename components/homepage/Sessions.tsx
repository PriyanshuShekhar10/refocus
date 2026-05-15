import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";

type Length = {
  minutes: number;
  name: string;
  desc: string;
  featured?: boolean;
};

const LENGTHS: Length[] = [
  {
    minutes: 25,
    name: "Sprint",
    desc: "For shallow tasks, replies, planning. The Pomodoro classic.",
  },
  {
    minutes: 50,
    name: "Deep work",
    desc: "The sweet spot for most focused sessions. Long enough to get in, short enough to come back.",
    featured: true,
  },
  {
    minutes: 75,
    name: "Marathon",
    desc: "For writing, research, anything that needs runway. One long quiet hour and change.",
  },
];

export function Sessions() {
  return (
    <section className={styles.block} id="sessions">
      <div className={styles.wrap}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.eyebrow}>01 — Sessions</span>
          <h2 className={styles.sectionTitle}>Three lengths. One ritual.</h2>
          <p className={styles.sectionSub}>
            Match the timer to the task. Start solo or invite a partner — your
            timer syncs to theirs automatically.
          </p>
        </Reveal>

        <div className={styles.lengths}>
          {LENGTHS.map((l, i) => (
            <Reveal
              key={l.minutes}
              delayMs={i * 80}
              className={`${styles.lengthCard} ${
                l.featured ? styles.lengthCardFeatured : ""
              }`}
            >
              <div className={styles.lcTime}>
                {l.minutes}
                <span className={styles.lcUnit}>min</span>
              </div>
              <div className={styles.lcName}>{l.name}</div>
              <div className={styles.lcDesc}>{l.desc}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
