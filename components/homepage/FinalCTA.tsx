import Link from "next/link";
import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";
import { ArrowIcon } from "./ArrowIcon";

export function FinalCTA() {
  return (
    <section className={styles.finalCta} id="faq">
      <div className={styles.wrap}>
        <Reveal as="h2">
          Sit down. Start the timer.
          <br />
          Get the thing done.
        </Reveal>
        <Reveal as="p">Free to start. One click to your first session.</Reveal>
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
            See it in action
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
