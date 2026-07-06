"use client";

import { useEffect, useState } from "react";

export type RecentSession = {
  id: string;
  start: string;
  durationMin: number;
  sessionType: string;
  name: string | null;
  attended: boolean;
  completed: boolean;
  solo: boolean;
  partnerName?: string | null;
  partnerAvatarUrl?: string | null;
};

export type TrendDay = { date: string; sessions: number; minutes: number };

export type SessionStats = {
  booked: number;
  attended: number;
  missed: number;
  completed: number;
  attendanceRate: number;
  completionRate: number;
  totalMinutes: number;
  withPartner: number;
  solo: number;
  asOwner: number;
  currentStreak: number;
  longestStreak: number;
  typeBreakdown: Record<string, number>;
  byWeekday: number[];
  trend: TrendDay[];
  recent: RecentSession[];
};

export function useSessionStats() {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/me/stats");
        if (!res.ok) throw new Error("Could not load stats");
        const data = await res.json();
        if (!cancelled) setStats(data.stats as SessionStats);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading, error };
}
