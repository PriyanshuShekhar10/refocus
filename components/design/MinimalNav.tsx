"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./design.module.css";

type NavCta = {
  label: string;
  href: string;
  variant?: "quiet" | "primary";
};

type MinimalNavProps = {
  /** Optional sticky-scroll border behaviour (default true). */
  sticky?: boolean;
  /** CTA buttons rendered on the right side. */
  ctas?: NavCta[];
  /** Inline links (e.g., "Help") rendered between brand and CTAs. */
  links?: { label: string; href: string }[];
};

export function MinimalNav({
  sticky = true,
  ctas = [],
  links = [],
}: MinimalNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!sticky) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sticky]);

  return (
    <header
      className={`${styles.nav} ${scrolled ? styles.navScrolled : ""}`}
      style={sticky ? undefined : { position: "relative" }}
    >
      <div className={`${styles.wrap} ${styles.navInner}`}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span>Refocus</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`${styles.btn} ${styles.btnQuiet}`}
            >
              {l.label}
            </Link>
          ))}
          {ctas.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`${styles.btn} ${
                c.variant === "primary" ? styles.btnPrimary : styles.btnQuiet
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
