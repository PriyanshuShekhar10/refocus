import Link from "next/link";
import Image from "next/image";
import { LightDashboard } from "@/assets/exports";
import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";
import { ArrowIcon } from "./ArrowIcon";
import { LiveCount } from "./LiveCount";

const AVATAR_COLORS = ["#FFF1D3", "#FFB090", "#CA5995", "#5D1C6A"];

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.wrap}>
        <Reveal as="span" className={styles.livePill}>
          <span className={styles.liveDot} aria-hidden="true" />
          <span>
            <LiveCount /> people in live focus sessions
          </span>
        </Reveal>

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
          <Link
            href="/auth/sign-up"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
          >
            Start free session
            <ArrowIcon />
          </Link>
          <Link
            href="/dashboard"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnLg}`}
          >
            Find a partner
          </Link>
        </Reveal>

        <Reveal className={styles.heroFoot}>
          <span className={styles.avatars} aria-hidden="true">
            {AVATAR_COLORS.map((bg) => (
              <span key={bg} style={{ background: bg }} />
            ))}
          </span>
          <span>Free to start. No card required.</span>
        </Reveal>

        <div className={styles.preview}>
          <div className={styles.previewBar}>
            <i />
            <i />
            <i />
          </div>
          <Image
            src={LightDashboard}
            alt="Refocus dashboard with an active focus session"
            className={styles.previewImg}
            priority
            placeholder="blur"
            sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1200px) calc(100vw - 56px), 1144px"
            quality={75}
          />
          <div className={styles.previewOverlay} />
        </div>
      </div>
    </section>
  );
}
