"use client";

import { useCallback, useEffect, useState } from "react";

export type CommunityLayoutMode = "feed" | "split";

const LAYOUT_STORAGE_KEY = "refocus-community-layout";
const WIDTH_STORAGE_KEY = "refocus-community-chat-width";

export const MIN_CHAT_WIDTH = 220;
export const MAX_CHAT_WIDTH = 280;
export const DEFAULT_CHAT_WIDTH = 260;

function loadLayout(): CommunityLayoutMode {
  if (typeof window === "undefined") return "split";
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (stored === "feed" || stored === "split") return stored;
  // Migrate legacy "chat" full-board mode
  if (stored === "chat") return "split";
  return "split";
}

function loadWidth(): number {
  if (typeof window === "undefined") return DEFAULT_CHAT_WIDTH;
  const stored = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
  if (!Number.isFinite(stored)) return DEFAULT_CHAT_WIDTH;
  return Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, stored));
}

export function useCommunityPanelLayout() {
  const [layout, setLayoutState] = useState<CommunityLayoutMode>("split");
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);

  useEffect(() => {
    setLayoutState(loadLayout());
    const width = loadWidth();
    setChatWidth(width);
    localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
  }, []);

  const setLayout = useCallback((mode: CommunityLayoutMode) => {
    setLayoutState(mode);
    localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
  }, []);

  return { layout, setLayout, chatWidth };
}
