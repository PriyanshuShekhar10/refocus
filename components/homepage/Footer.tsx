import Link from "next/link";
import styles from "./Homepage.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.wrap} ${styles.footInner}`}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span>Refocus</span>
        </Link>
        <div className={styles.footLinks}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/changelog">Changelog</Link>
        </div>
        <div className={styles.footMeta}>v0.4.2 · made for deep work</div>
      </div>
    </footer>
  );
}
