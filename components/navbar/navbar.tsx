"use client";
import React, { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import styles from "./Navbar.module.css";
import Image from "next/image";
import { Logo } from "@/assets/exports";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { hasEnvVars } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

export const NavbarLogo = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Link href="/">
      <Image
        src={Logo}
        alt="logo"
        className={cn(
          `py-3 h-20`,
          mounted && theme === "dark" && "invert brightness-0"
        )}
      />
    </Link>
  );
};

// Client-side authentication component for the navbar
function NavbarAuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();

    // Get initial session
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex gap-2">
        <button className={styles.loadingBtn} disabled>
          Loading...
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex gap-2">
        <button className={styles.loadingBtn} disabled>
          Loading...
        </button>
      </div>
    );
  }

  if (!hasEnvVars) {
    return (
      <div className="flex gap-4 items-center">
        <Badge variant={"outline"} className="font-normal">
          Supabase environment variables required
        </Badge>
        <div className="flex gap-2">
          <Button size="sm" variant={"outline"} disabled>
            Sign in
          </Button>
          <Button size="sm" variant={"default"} disabled>
            Sign up
          </Button>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/profile" className={styles.signUpBtn}>
          My Profile
        </Link>
        <Link href="/dashboard" className={styles.signUpBtn}>
          Dashboard
        </Link>
        <button className={styles.signInBtn} onClick={logout}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Link href="/auth/login" className={styles.signInBtn}>
        Sign in
      </Link>
      <Link href="/auth/sign-up" className={styles.signUpBtn}>
        Sign up
      </Link>
    </div>
  );
}

const Navbar = () => {
  const [isFixed, setIsFixed] = useState(false);

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

  return (
    <nav
      className={`${styles.navbar + " rounded-full"} ${
        isFixed ? styles.fixed + " rounded-none" : ""
      } backdrop-blur-md`}
    >
      <div className={styles.logo}>
        <NavbarLogo />
      </div>

      <ul className={styles.navLinks}>
        {navItems.map((item, idx) => (
          <li key={`nav-item-${idx}`}>
            <a href={item.link}>{item.name}</a>
          </li>
        ))}
      </ul>

      <div className={styles.authButtons}>
        <ThemeSwitcher />
        <NavbarAuthButton />
      </div>
    </nav>
  );
};

export default Navbar;
