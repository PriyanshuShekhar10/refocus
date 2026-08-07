import { useState, useEffect } from "react";
import styles from "./Navbar.module.css";
import { url } from "../lib/config";

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function AuthButtons({
  isMobile = false,
  onClose,
}: {
  isMobile?: boolean;
  onClose?: () => void;
}) {
  return (
    <div className={isMobile ? styles.mobileAuthButtons : "nav-auth-desktop"}>
      <a href={url("/auth/login")} className={styles.signInBtn} onClick={onClose}>
        Sign in
      </a>
      <a href={url("/auth/sign-up")} className={styles.signUpBtn} onClick={onClose}>
        Sign up
      </a>
    </div>
  );
}

const navItems = [
  { name: "Sessions", link: "/#sessions" },
  { name: "How it works", link: "/#how" },
  { name: "Blog", link: "/blog" },
  { name: "FAQ", link: "/#faq" },
  { name: "Careers", link: "/career" },
];

export default function Navbar() {
  const [isFixed, setIsFixed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > window.innerHeight * 0.1) {
        setIsFixed(true);
      } else {
        setIsFixed(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <nav className={cn(styles.navbar, isFixed ? styles.fixed : styles.rounded)}>
        <div className={styles.logo}>
          <a href="/" className="nav-logo-link">
            <img src="/logo.svg" alt="Refocus" className="nav-logo-img" />
          </a>
        </div>

        <div className={styles.navRight}>
          <ul className={styles.navLinks}>
            {navItems.map((item, idx) => (
              <li key={`nav-item-${idx}`}>
                <a href={item.link}>{item.name}</a>
              </li>
            ))}
          </ul>
          <div className={styles.authButtons}>
            <AuthButtons />
          </div>
        </div>

        <button
          className={styles.mobileMenuButton}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </nav>

      {isMobileMenuOpen && (
        <div className={styles.mobileMenuOverlay} onClick={closeMobileMenu} />
      )}

      <div
        className={cn(styles.mobileMenu, isMobileMenuOpen && styles.mobileMenuOpen)}
      >
        <div className={styles.mobileMenuContent}>
          <ul className={styles.mobileNavLinks}>
            {navItems.map((item, idx) => (
              <li key={`mobile-nav-item-${idx}`}>
                <a href={item.link} onClick={closeMobileMenu}>
                  {item.name}
                </a>
              </li>
            ))}
          </ul>

          <div className={styles.mobileMenuFooter}>
            <AuthButtons isMobile onClose={closeMobileMenu} />
          </div>
        </div>
      </div>
    </>
  );
}
