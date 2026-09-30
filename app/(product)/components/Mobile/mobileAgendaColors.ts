"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";

/** Mobile agenda tokens — light and dark palettes share Plum/Sage hierarchy. */
export type AgendaColors = {
  page: string;
  card: string;
  elevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  plum: string;
  plumCta: string;
  plumCtaPressed: string;
  plumBright: string;
  plumMuted: string;
  plumSoft: string;
  sage: string;
  sageSoft: string;
  hover: string;
  ringOffset: string;
  avatarFallbackBg: string;
  avatarFallbackText: string;
  colorScheme: "light" | "dark";
};

/**
 * Both palettes resolve to the shared Refocus design tokens (see app/globals.css),
 * which already switch with the `.dark` class. The scheme flag stays per theme.
 */
const tokenColors: Omit<AgendaColors, "colorScheme"> = {
  page: "var(--rf-bg)",
  card: "var(--rf-card)",
  elevated: "var(--rf-card)",
  border: "var(--rf-line)",
  text: "var(--rf-ink)",
  textSecondary: "var(--rf-ink-soft)",
  textMuted: "var(--rf-ink-mute)",
  plum: "var(--rf-primary)",
  plumCta: "var(--rf-primary)",
  plumCtaPressed: "var(--rf-primary-hover)",
  plumBright: "var(--rf-plum-ink)",
  plumMuted: "var(--rf-plum-ink)",
  plumSoft: "var(--rf-cream-bg)",
  sage: "var(--rf-online)",
  sageSoft: "var(--rf-success-soft)",
  hover: "var(--rf-line-soft)",
  ringOffset: "var(--rf-bg)",
  avatarFallbackBg: "var(--rf-line-soft)",
  avatarFallbackText: "var(--rf-ink-soft)",
};

export const agendaDark: AgendaColors = { ...tokenColors, colorScheme: "dark" };

export const agendaLight: AgendaColors = { ...tokenColors, colorScheme: "light" };

export function getAgendaColors(resolvedTheme: string | undefined): AgendaColors {
  return resolvedTheme === "dark" ? agendaDark : agendaLight;
}

export function useMobileAgendaColors(): AgendaColors {
  const { resolvedTheme } = useTheme();
  return useMemo(() => getAgendaColors(resolvedTheme), [resolvedTheme]);
}

/** @deprecated Use useMobileAgendaColors() — kept for type re-exports only */
export const agenda = agendaDark;
