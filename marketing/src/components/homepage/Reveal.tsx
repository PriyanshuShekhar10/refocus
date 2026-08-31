"use client";

import { createElement } from "react";
import type { ElementType, ReactNode } from "react";

type RevealProps = {
  as?: ElementType;
  delayMs?: number;
  className?: string;
  children: ReactNode;
};

/** Layout wrapper only — scroll reveal animations removed for clearer UX. */
export function Reveal({
  as: Tag = "div",
  className,
  children,
}: RevealProps) {
  return createElement(Tag, { className: className ?? undefined }, children);
}
