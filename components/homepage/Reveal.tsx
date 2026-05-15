"use client";

import { createElement, useEffect, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";
import styles from "./Homepage.module.css";

type RevealProps = {
  as?: ElementType;
  delayMs?: number;
  className?: string;
  children: ReactNode;
};

export function Reveal({
  as: Tag = "div",
  delayMs = 0,
  className,
  children,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const classes = [
    styles.reveal,
    shown ? styles.revealIn : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return createElement(
    Tag,
    {
      ref,
      className: classes,
      style: delayMs ? { transitionDelay: `${delayMs}ms` } : undefined,
    },
    children
  );
}
