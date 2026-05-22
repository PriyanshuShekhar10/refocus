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
          <Link href="/career">Career</Link>
          <Link href="/auth/login">Log in</Link>
          <Link href="/auth/sign-up">Sign up</Link>
        </div>
        <div className={styles.footMeta}>v0.4.2 · made for deep work</div>
      </div>
      <div className={styles.footBadgeWrap} aria-hidden="true">
        <a
          href="https://www.betterlaunch.co"
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={-1}
        >
          <img
            src="https://www.betterlaunch.co/badge-light.svg"
            alt="Featured on Better Launch"
            className={styles.footBadge}
          />
        </a>
      </div>
    </footer>
  );
}
