"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getBrowserTimeZone,
  getDisplayTimeZone,
  setActiveDisplayTimeZone,
} from "@/lib/localTime";
import { isValidTimeZone } from "@/lib/zonedTime";

export const TIMEZONE_PREF_EVENT = "preferences:timezone";

type TimezoneContextValue = {
  /** Stored preference: "auto" or IANA id */
  preference: string;
  /** Effective IANA zone used for display/calendar */
  timeZone: string;
  setPreference: (value: string) => void;
};

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

function resolveEffective(preference: string): string {
  if (preference && preference !== "auto" && isValidTimeZone(preference)) {
    return preference;
  }
  return getBrowserTimeZone();
}

function applyPreference(preference: string) {
  if (preference && preference !== "auto" && isValidTimeZone(preference)) {
    setActiveDisplayTimeZone(preference);
  } else {
    setActiveDisplayTimeZone(undefined);
  }
}

export function UserTimezoneProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState("auto");
  const [timeZone, setTimeZone] = useState(getBrowserTimeZone);

  const apply = useCallback((pref: string) => {
    const next = pref && isValidTimeZone(pref) ? pref : "auto";
    setPreferenceState(next === "auto" ? "auto" : next);
    applyPreference(next);
    setTimeZone(resolveEffective(next));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/preferences");
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const pref = data?.preferences?.timezone;
        if (cancelled) return;
        if (typeof pref === "string") apply(pref);
      } catch {
        // keep browser default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  useEffect(() => {
    const onPref = (e: Event) => {
      const ce = e as CustomEvent<{ timezone?: string }>;
      if (typeof ce.detail?.timezone === "string") {
        apply(ce.detail.timezone);
      }
    };
    window.addEventListener(TIMEZONE_PREF_EVENT, onPref);
    return () => window.removeEventListener(TIMEZONE_PREF_EVENT, onPref);
  }, [apply]);

  const setPreference = useCallback(
    (value: string) => {
      apply(value);
    },
    [apply],
  );

  const value = useMemo(
    () => ({ preference, timeZone, setPreference }),
    [preference, timeZone, setPreference],
  );

  return (
    <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>
  );
}

export function useUserTimezone(): TimezoneContextValue {
  const ctx = useContext(TimezoneContext);
  if (ctx) return ctx;
  return {
    preference: "auto",
    timeZone: getDisplayTimeZone(),
    setPreference: () => {},
  };
}
