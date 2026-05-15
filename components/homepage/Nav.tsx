"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import styles from "./Homepage.module.css";
import { Logo } from "@/assets/exports";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { status } = useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isAuthed = status === "authenticated";

  return (
    <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ""}`}>
      <div className={`${styles.wrap} ${styles.navInner}`}>
        <Link href="/" className={styles.brand}>
          <Image
            src={Logo}
            alt="Refocus"
            className="h-7 w-auto"
            priority
          />
        </Link>

        <nav aria-label="Primary">
          <ul className={styles.navLinks}>
            <li>
              <a href="#how">How it works</a>
            </li>
            <li>
              <a href="#sessions">Sessions</a>
            </li>
            <li>
              <a href="#community">Community</a>
            </li>
            <li>
              <a href="#faq">FAQ</a>
            </li>
            <li>
              <Link href="/career">Career</Link>
            </li>
          </ul>
        </nav>

        <div className={styles.navCta}>
          {isAuthed ? (
            <>
              <Link
                href="/profile"
                className={`${styles.btn} ${styles.btnQuiet}`}
              >
                Profile
              </Link>
              <Link
                href="/dashboard"
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                Open dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className={`${styles.btn} ${styles.btnQuiet}`}
              >
                Log in
              </Link>
              <Link
                href="/auth/sign-up"
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                Start focusing
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
