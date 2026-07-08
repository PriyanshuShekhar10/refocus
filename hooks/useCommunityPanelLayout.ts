"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CommunityLayoutMode = "feed" | "split" | "chat";

const LAYOUT_STORAGE_KEY = "refocus-community-layout";
const WIDTH_STORAGE_KEY = "refocus-community-chat-width";

export const MIN_CHAT_WIDTH = 300;
export const MAX_CHAT_WIDTH = 720;
export const DEFAULT_CHAT_WIDTH = 380;

function loadLayout(): CommunityLayoutMode {
  if (typeof window === "undefined") return "split";
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (stored === "feed" || stored === "split" || stored === "chat") return stored;
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
  const widthRef = useRef(chatWidth);

  useEffect(() => {
    setLayoutState(loadLayout());
    setChatWidth(loadWidth());
  }, []);

  useEffect(() => {
    widthRef.current = chatWidth;
  }, [chatWidth]);

  const setLayout = useCallback((mode: CommunityLayoutMode) => {
    setLayoutState(mode);
    localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
  }, []);

  const startResize = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = widthRef.current;

    const onMove = (moveEvent: MouseEvent) => {
      const next = Math.min(
        MAX_CHAT_WIDTH,
        Math.max(MIN_CHAT_WIDTH, startWidth + (startX - moveEvent.clientX)),
      );
      setChatWidth(next);
      widthRef.current = next;
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem(WIDTH_STORAGE_KEY, String(widthRef.current));
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  return { layout, setLayout, chatWidth, startResize };
}
