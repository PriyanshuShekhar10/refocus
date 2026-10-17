import { useState, useEffect } from "react";
import styles from "./LandingNavbar.module.css";
import { url } from "../lib/config";

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const navLinks = [
  { name: "Features", link: "/#how" },
  { name: "Free", link: "/free" },
  { name: "Pricing", link: "/pricing" },
  { name: "Blog", link: "/blog" },
  { name: "About", link: "/about" },
];

/** Glass hamburger-menu header used on the main landing page only. */
export default function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date()
          .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          .toLowerCase(),
      );
    tick();
    const id = setInterval(tick, 1000 * 30);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
      <button
        type="button"
        className={styles.menuBtn}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        <svg width="28" height="24" viewBox="0 0 28 24" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="26" height="10" rx="5" fill="#1d1d1f" />
          <circle cx={menuOpen ? 7 : 21} cy="6" r="3.2" fill="#f2f2f2" />
          <rect
            x="1.75"
            y="13.75"
            width="24.5"
            height="8.5"
            rx="4.25"
            stroke="#1d1d1f"
            strokeWidth="1.5"
          />
          <circle cx={menuOpen ? 21 : 7} cy="18" r="3.2" fill="#1d1d1f" />
        </svg>
      </button>

      {menuOpen ? (
        <div className={styles.overlay}>
          <div className={styles.overlayInner}>
            <div className={styles.overlayMeta}>
              <span>{clock}</span>
              <span>v0.4.2</span>
            </div>

            <div className={styles.row2}>
              <div className={styles.stack}>
                <a href="/#faq" onClick={close} className={styles.pillLink}>
                  faq
                </a>
                <a
                  href={url("/auth/sign-up")}
                  onClick={close}
                  className={cn(styles.pillLink, styles.pillLinkStrong)}
                >
                  <span className={styles.signDot} />
                  sign up
                </a>
              </div>

              <div className={styles.statusCard}>
                <div className={styles.statusHead}>
                  <img
                    src="/avatars/maya.jpg"
                    alt="Maya"
                    className={styles.statusAvatar}
                    width={56}
                    height={56}
                  />
                  <span className={styles.statusTag}>focusing</span>
                </div>
                <div>
                  <div className={styles.statusTime}>32:14</div>
                  <div className={styles.statusName}>deep work</div>
                  <div className={styles.statusWith}>with maya</div>
                </div>
              </div>
            </div>

            <div className={cn(styles.row2, styles.row2Top)}>
              {navLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.link}
                  onClick={close}
                  className={styles.tile}
                >
                  {item.name.toLowerCase()}
                </a>
              ))}
              <a
                href={url("/auth/login")}
                onClick={close}
                className={styles.tile}
              >
                sign in
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
