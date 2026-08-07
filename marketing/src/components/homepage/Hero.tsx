import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";
import { ArrowIcon } from "./ArrowIcon";
import { url } from "../../lib/config";

const AVATAR_COLORS = ["#FFF1D3", "#FFB090", "#CA5995", "#5D1C6A"];

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.wrap}>
        <Reveal as="h1" className={styles.heroTitle}>
          Virtual coworking
          <br />
          for accountability.
          <br />
          <em>Get more done.</em>
        </Reveal>

        <Reveal as="p" className={styles.heroSub}>
          Refocus pairs you with another person for a 25, 50, or 75-minute
          focus session. Share your goal, work side by side, and check in at
          the end.
        </Reveal>

        <Reveal className={styles.heroCta}>
          <a
            href={url("/auth/sign-up")}
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
          >
            Start free session
            <ArrowIcon />
          </a>
          <a
            href={url("/dashboard")}
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnLg}`}
          >
            Find a partner
          </a>
        </Reveal>

        <Reveal className={styles.heroFoot}>
          <span className={styles.avatars} aria-hidden="true">
            {AVATAR_COLORS.map((bg) => (
              <span key={bg} style={{ background: bg }} />
            ))}
          </span>
          <span>Free to start. No card required.</span>
        </Reveal>

        <Reveal className={styles.preview}>
          <img
            src="/dashboard.png"
            alt="Refocus dashboard with an active focus session"
            className={styles.previewImg}
            width={2940}
            height={1766}
            loading="eager"
            decoding="async"
          />
        </Reveal>
      </div>
    </section>
  );
}
