import { useState, useEffect } from "react";
import styles from "./Navbar.module.css";
import { url } from "../lib/config";

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const navItems = [
  { name: "Sessions", link: "/#sessions" },
  { name: "Features", link: "/features" },
  { name: "Free", link: "/free" },
  { name: "Pricing", link: "/pricing" },
  { name: "FAQ", link: "/#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
    <header className={cn(styles.header, scrolled && styles.scrolled)}>
      <div className={styles.inner}>
        <a href="/" className={styles.logo} onClick={close}>
          <img
            src="/logo.svg"
            alt="Refocus"
            width={182}
            height={52}
            decoding="async"
            // @ts-expect-error fetchpriority is a valid HTML attribute
            fetchPriority="low"
          />
        </a>

        <nav className={styles.links} aria-label="Primary">
          {navItems.map((item) => (
            <a key={item.name} href={item.link}>
              {item.name}
            </a>
          ))}
        </nav>

        <div className={styles.auth}>
          <a href={url("/auth/login")} className={styles.signIn}>
            Sign in
          </a>
          <a href={url("/auth/sign-up")} className={styles.signUp}>
            Sign up
          </a>
        </div>

        <button
          type="button"
          className={styles.menuBtn}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className={cn(styles.menuIcon, menuOpen && styles.menuIconOpen)} />
        </button>
      </div>

      <div className={cn(styles.mobile, menuOpen && styles.mobileOpen)}>
        <nav className={styles.mobileLinks} aria-label="Mobile">
          {navItems.map((item) => (
            <a key={item.name} href={item.link} onClick={close}>
              {item.name}
            </a>
          ))}
        </nav>
        <div className={styles.mobileAuth}>
          <a href={url("/auth/login")} className={styles.signIn} onClick={close}>
            Sign in
          </a>
          <a href={url("/auth/sign-up")} className={styles.signUp} onClick={close}>
            Sign up
          </a>
        </div>
      </div>
    </header>
  );
}
