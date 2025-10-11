"use client";
import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import styles from "./Navbar.module.css";
import Image from "next/image";
import { Logo } from "@/assets/exports";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";

export const NavbarLogo = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Link href="/" className="flex items-center">
      <Image
        src={Logo}
        alt="logo"
        className={cn(
          `h-12 w-auto py-2 sm:h-16 sm:py-3 md:h-20`,
          mounted && theme === "dark" && "invert brightness-0"
        )}
      />
    </Link>
  );
};

// Client-side authentication component for the navbar
function NavbarAuthButton({ isMobile = false, onClose }: { isMobile?: boolean; onClose?: () => void }) {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const logout = async () => {
    await signOut({ redirect: false });
    router.push("/auth/login");
    onClose?.();
  };

  const handleNavigation = () => {
    onClose?.();
  };

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={isMobile ? styles.mobileAuthButtons : "flex gap-2"}>
        <button className={styles.loadingBtn} disabled>
          Loading...
        </button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className={isMobile ? styles.mobileAuthButtons : "flex gap-2"}>
        <button className={styles.loadingBtn} disabled>
          Loading...
        </button>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className={isMobile ? styles.mobileAuthButtons : "flex items-center gap-4"}>
        <Link href="/profile" className={styles.signUpBtn} onClick={handleNavigation}>
          My Profile
        </Link>
        <Link href="/dashboard" className={styles.signUpBtn} onClick={handleNavigation}>
          Dashboard
        </Link>
        <button className={styles.signInBtn} onClick={logout}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className={isMobile ? styles.mobileAuthButtons : "flex gap-3"}>
      <Link href="/auth/login" className={styles.signInBtn} onClick={handleNavigation}>
        Sign in
      </Link>
      <Link href="/auth/sign-up" className={styles.signUpBtn} onClick={handleNavigation}>
        Sign up
      </Link>
    </div>
  );
}

const Navbar = () => {
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

  // Close mobile menu on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when menu is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    {
      name: "Features",
      link: "#features",
    },
    {
      name: "FAQ",
      link: "#faq",
    },
    {
      name: "About Us",
      link: "/about",
    },
  ];

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav
        className={`${styles.navbar} ${isFixed ? styles.fixed : styles.rounded}`}
      >
        <div className={styles.logo}>
          <NavbarLogo />
        </div>

        {/* Desktop Navigation */}
        <ul className={styles.navLinks}>
          {navItems.map((item, idx) => (
            <li key={`nav-item-${idx}`}>
              <a href={item.link}>{item.name}</a>
            </li>
          ))}
        </ul>

        {/* Desktop Auth Buttons */}
        <div className={styles.authButtons}>
          <ThemeSwitcher />
          <NavbarAuthButton />
        </div>

        {/* Mobile Menu Button */}
        <button
          className={styles.mobileMenuButton}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className={styles.mobileMenuOverlay} onClick={closeMobileMenu} />
      )}

      {/* Mobile Menu */}
      <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.mobileMenuOpen : ""}`}>
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
            <div className={styles.mobileThemeSwitcher}>
              <ThemeSwitcher />
            </div>
            <NavbarAuthButton isMobile onClose={closeMobileMenu} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;