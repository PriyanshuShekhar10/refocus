import Link from "next/link";
import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";
import { ArrowIcon } from "./ArrowIcon";

export function FinalCTA() {
  return (
    <section className={styles.finalCta}>
      <div className={styles.wrap}>
        <Reveal as="h2">
          Start timer.
          <br />
          Do the work.
        </Reveal>
        <Reveal as="p">Free to start. One click.</Reveal>
        <Reveal className={styles.finalCtaRow}>
          <Link
            href="/auth/sign-up"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
          >
            Start focusing
            <ArrowIcon />
          </Link>
          <Link
            href="/features"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnLg}`}
          >
            See features
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
