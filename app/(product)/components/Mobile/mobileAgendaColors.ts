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

export const agendaDark: AgendaColors = {
  page: "#0E1624",
  card: "#182132",
  elevated: "#202A3A",
  border: "#354055",
  text: "#F5F2F6",
  textSecondary: "#AAA6B1",
  textMuted: "#7A7684",
  plum: "#8A328F",
  plumCta: "#76287E",
  plumCtaPressed: "#5F2066",
  plumBright: "#C55CB4",
  plumMuted: "#C178B8",
  plumSoft: "#21182B",
  sage: "#8FA58F",
  sageSoft: "#1B2927",
  hover: "#202A3A",
  ringOffset: "#0E1624",
  avatarFallbackBg: "#2A3444",
  avatarFallbackText: "#AAA6B1",
  colorScheme: "dark",
};

export const agendaLight: AgendaColors = {
  page: "#f7f8fa",
  card: "#ffffff",
  elevated: "#ffffff",
  border: "#e5e7eb",
  text: "#0a0a0a",
  textSecondary: "#4a4a47",
  textMuted: "#8a8a85",
  plum: "#8A328F",
  plumCta: "#76287E",
  plumCtaPressed: "#5F2066",
  plumBright: "#9f1bb9",
  plumMuted: "#8A328F",
  plumSoft: "#FFF1D3",
  sage: "#5b8a6b",
  sageSoft: "#e6efe9",
  hover: "#eef0f3",
  ringOffset: "#f7f8fa",
  avatarFallbackBg: "#e1e8f0",
  avatarFallbackText: "#4a4a47",
  colorScheme: "light",
};

export function getAgendaColors(resolvedTheme: string | undefined): AgendaColors {
  return resolvedTheme === "dark" ? agendaDark : agendaLight;
}

export function useMobileAgendaColors(): AgendaColors {
  const { resolvedTheme } = useTheme();
  return useMemo(() => getAgendaColors(resolvedTheme), [resolvedTheme]);
}

/** @deprecated Use useMobileAgendaColors() — kept for type re-exports only */
export const agenda = agendaDark;
