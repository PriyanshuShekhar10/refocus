"use client";

import { useEffect, useState } from "react";
import styles from "./Homepage.module.css";

const INITIAL = 1247;
const MIN = 1100;
const MAX = 1400;
const TICK_MS = 4200;

export function LiveCount() {
  const [count, setCount] = useState(INITIAL);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCount((prev) => {
        const drift = Math.random() < 0.5 ? -1 : 1;
        return Math.max(MIN, Math.min(MAX, prev + drift));
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  return <span className={styles.mono}>{count.toLocaleString()}</span>;
}
