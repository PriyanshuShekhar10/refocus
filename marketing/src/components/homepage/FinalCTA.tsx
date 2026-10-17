import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";
import { ArrowIcon } from "./ArrowIcon";
import { url } from "../../lib/config";

export function FinalCTA() {
  return (
    <section className={styles.finalCta}>
      <div className={styles.wrap}>
        <Reveal as="h2">sit down. start the timer. get the thing done.</Reveal>
        <Reveal as="p">free to start. one click to your first session.</Reveal>
        <Reveal className={styles.finalCtaRow}>
          <a
            href={url("/auth/sign-up")}
            className={`${styles.btn} ${styles.btnBrand} ${styles.btnLg}`}
          >
            start focusing
            <ArrowIcon />
          </a>
          <a
            href="/features"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnLg}`}
          >
            see features
          </a>
        </Reveal>
      </div>
    </section>
  );
}
