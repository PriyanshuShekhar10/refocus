import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";
import Image from "next/image";
import { LightDashboard } from "@/assets/exports";

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
    desc: "Quick tasks. Inbox. Planning.",
  },
  {
    minutes: 50,
    name: "Deep work",
    desc: "Deep focus. Best default.",
    featured: true,
  },
  {
    minutes: 75,
    name: "Marathon",
    desc: "Big tasks. Writing. Research.",
  },
];

export function Sessions() {
  return (
    <section className={styles.block} id="sessions">
      <div className={styles.wrap}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.eyebrow}>01 — Sessions</span>
          <h2 className={styles.sectionTitle}>Pick a timer. Start.</h2>
          <p className={styles.sectionSub}>
            Solo or paired. Same clock. Clear finish.
          </p>
        </Reveal>

        <Reveal className={styles.sectionPreviewWrap}>
          <Image
            src={LightDashboard}
            alt="Refocus dashboard preview"
            className={styles.sectionPreviewImage}
            placeholder="blur"
            sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1200px) calc(100vw - 56px), 1080px"
            quality={80}
          />
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
