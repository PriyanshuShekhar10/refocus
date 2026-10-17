import styles from "./Homepage.module.css";
import { url } from "../../lib/config";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <div className={styles.footGrid}>
          <div className={styles.footCol}>
            <span className={styles.footColHead}>product</span>
            <a href="/features">features</a>
            <a href="/free">free</a>
            <a href="/pricing">pricing</a>
            <a href={url("/auth/login")}>log in</a>
            <a href={url("/auth/sign-up")}>sign up</a>
          </div>
          <div className={styles.footCol}>
            <span className={styles.footColHead}>resources</span>
            <a href="/blog">blog</a>
            <a href="/body-doubling">body doubling</a>
            <a href="/virtual-coworking">virtual coworking</a>
            <a href="/focus-room">focus room</a>
            <a href="/study-partner">study partner</a>
            <a href="/study-with-me">study with me</a>
            <a href="/developers">developers</a>
          </div>
          <div className={styles.footCol}>
            <span className={styles.footColHead}>compare</span>
            <a href="/focusmate-alternative">vs focusmate</a>
            <a href="/cofocus-alternative">vs cofocus</a>
            <a href="/studystream-alternative">vs studystream</a>
          </div>
          <div className={styles.footCol}>
            <span className={styles.footColHead}>company</span>
            <a href="/about">about</a>
            <a href="/contact">contact</a>
            <a href="/support">help and support</a>
            <a href="/privacy">privacy</a>
            <a href="/terms">terms</a>
            <a href="/community-guidelines">community guidelines</a>
            <a href="/delete-account">delete account</a>
          </div>
        </div>
        <div className={styles.footMeta}>v0.4.2 · made for deep work</div>
      </div>
    </footer>
  );
}
