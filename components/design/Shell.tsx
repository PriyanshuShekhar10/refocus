import type { ReactNode } from "react";
import styles from "./design.module.css";

type ShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Wraps a page subtree with the Refocus design tokens (cool-white bg, sky
 * pastel accent, Bricolage display, Geist Mono numerals). Apply once near
 * the top of a page or section. Inside the Shell, design-module classes
 * (.btn, .input, .card, .eyebrow, etc.) pick up the right variables.
 */
export function Shell({ children, className }: ShellProps) {
  return (
    <div className={[styles.shell, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export { styles as designStyles };
