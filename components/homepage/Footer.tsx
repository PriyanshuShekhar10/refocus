import Link from "next/link";
import Image from "next/image";
import styles from "./Homepage.module.css";
import { Logo } from "@/assets/exports";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.wrap} ${styles.footInner}`}>
        <Link href="/" className={styles.brand}>
          <Image src={Logo} alt="Refocus" className="h-7 w-auto" />
        </Link>
        <div className={styles.footLinks}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/career">Career</Link>
          <Link href="/changelog">Changelog</Link>
        </div>
        <div className={styles.footMeta}>v0.4.2 · made for deep work</div>
      </div>
    </footer>
  );
}
