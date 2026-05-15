import Link from "next/link";
import Image from "next/image";
import { LightDashboard } from "@/assets/exports";
import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";
import { ArrowIcon } from "./ArrowIcon";
import { LiveCount } from "./LiveCount";

const AVATAR_COLORS = ["#cdd3c4", "#e7d6c8", "#c8d2dc", "#d4cdc0"];

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.wrap}>
        <Reveal as="span" className={styles.livePill}>
          <span className={styles.liveDot} aria-hidden="true" />
          <span>
            <LiveCount /> people focusing right now
          </span>
        </Reveal>

        <Reveal as="h1" className={styles.heroTitle}>
          Focus is better
          <br />
          with company.
          <br />
          <em>Quietly.</em>
        </Reveal>

        <Reveal as="p" className={styles.heroSub}>
          Refocus is a virtual co-working room for deep work. Pick a 25, 50, or
          75&nbsp;minute session, drop in alone, with a friend, or with someone
          new — and get the thing done.
        </Reveal>

        <Reveal className={styles.heroCta}>
          <Link
            href="/auth/sign-up"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
          >
            Start a session
            <ArrowIcon />
          </Link>
          <Link
            href="/dashboard"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnLg}`}
          >
            Book with a partner
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

        <Reveal className={styles.preview} delayMs={100}>
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
          />
          <div className={styles.previewOverlay} />
        </Reveal>
      </div>
    </section>
  );
}
