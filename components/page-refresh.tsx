"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { RefreshCw } from "lucide-react";

type RefreshHandler = () => void | Promise<void>;

type PageRefreshContextValue = {
  refreshing: boolean;
  refresh: (extra?: RefreshHandler) => Promise<void>;
};

const PageRefreshContext = createContext<PageRefreshContextValue | null>(null);

export function PageRefreshProvider({ children }: { children: ReactNode }) {
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  const refresh = useCallback(
    async (extra?: RefreshHandler) => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      setRefreshing(true);
      try {
        await Promise.all([
          mutate(() => true),
          extra ? Promise.resolve(extra()) : Promise.resolve(),
        ]);
        router.refresh();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
      }
    },
    [mutate, router],
  );

  return (
    <PageRefreshContext.Provider value={{ refreshing, refresh }}>
      {children}
    </PageRefreshContext.Provider>
  );
}

export function usePageRefresh() {
  const ctx = useContext(PageRefreshContext);
  if (!ctx) {
    throw new Error("usePageRefresh must be used within PageRefreshProvider");
  }
  return ctx;
}

/** Run a loader when a namespaced refresh event is dispatched from that page's button. */
export function useOnPageRefreshEvent(
  eventName: string,
  handler: RefreshHandler,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onRefresh = () => {
      void handlerRef.current();
    };
    window.addEventListener(eventName, onRefresh);
    return () => window.removeEventListener(eventName, onRefresh);
  }, [eventName]);
}

export function dispatchPageRefreshEvent(eventName: string) {
  window.dispatchEvent(new Event(eventName));
}

export const PAGE_REFRESH_EVENTS = {
  settings: "refocus:refresh-settings",
  sessions: "refocus:refresh-sessions",
} as const;

type PageRefreshButtonProps = {
  compact?: boolean;
  className?: string;
  /** Extra loader for this page (non-SWR data). */
  onRefresh?: RefreshHandler;
};

export function PageRefreshButton({
  compact = false,
  className = "",
  onRefresh,
}: PageRefreshButtonProps) {
  const { refreshing, refresh } = usePageRefresh();

  return (
    <button
      type="button"
      onClick={() => void refresh(onRefresh)}
      disabled={refreshing}
      aria-label="Refresh"
      title="Refresh"
      className={
        compact
          ? `rf-btn h-10 w-10 ${className}`
          : `rf-btn h-9 px-3.5 text-[13px] ${className}`
      }
    >
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      {compact ? null : "Refresh"}
    </button>
  );
}
