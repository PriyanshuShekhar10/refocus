"use client";
import { ChangeEvent, useEffect, useState } from "react";
import styles from "./friends.module.css";

interface PageHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
}

export default function PageHeader({ query, onQueryChange }: PageHeaderProps) {
  const [shortcut, setShortcut] = useState("⌘K");

  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
    setShortcut(isMac ? "⌘K" : "Ctrl K");
  }, []);

  return (
    <>
      <span className={styles.crumb}>Dashboard · Friends</span>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Friends.</h1>
          <p className={styles.pageSub}>
            The people you focus best with. Chat between sessions, send a
            session request, or just keep an eye on who&apos;s around.
          </p>
        </div>

        <label className={styles.search} role="search">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={styles.searchIcon}
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            type="text"
            placeholder="Find a friend"
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onQueryChange(e.target.value)
            }
            aria-label="Search friends"
          />
          <span className={styles.kbd}>{shortcut}</span>
        </label>
      </div>
    </>
  );
}
