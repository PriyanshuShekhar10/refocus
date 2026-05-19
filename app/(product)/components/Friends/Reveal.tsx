"use client";
import { useEffect, useRef, useState, ReactNode } from "react";
import styles from "./friends.module.css";

interface RevealProps {
  children: ReactNode;
  index?: number;
  className?: string;
  as?: "div" | "section";
}

export default function Reveal({
  children,
  index = 0,
  className,
  as = "div",
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.08 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const Tag = as;
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement & HTMLElement>}
      className={`${styles.reveal} ${visible ? styles.revealIn : ""} ${className ?? ""}`}
      style={{ transitionDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      {children}
    </Tag>
  );
}
