import styles from "./Homepage.module.css";
import { url } from "../../lib/config";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.wrap} ${styles.footInner}`}>
        <a href="/" className={styles.brand}>
          <img src="/logo.svg" alt="Refocus" style={{ height: 28, width: "auto" }} />
        </a>
        <div className={styles.footLinks}>
          <a href="/body-doubling">Body doubling</a>
          <a href="/virtual-coworking">Virtual coworking</a>
          <a href="/study-with-me">Study with me</a>
          <a href="/about">About</a>
          <a href="/blog">Blog</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href={url("/auth/login")}>Log in</a>
          <a href={url("/auth/sign-up")}>Sign up</a>
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
            width={1}
            height={1}
            className={styles.footBadge}
          />
        </a>
      </div>
    </footer>
  );
}
