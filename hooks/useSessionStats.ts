"use client";

import useSWR from "swr";
import { swrKeys } from "@/lib/swr/keys";

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

type StatsResponse = { stats?: SessionStats };

export function useSessionStats() {
  const { data, error, isLoading, isValidating, mutate } =
    useSWR<StatsResponse>(swrKeys.userStats);

  return {
    stats: data?.stats ?? null,
    loading: isLoading && !data,
    isValidating,
    error: error ? (error as Error).message : null,
    refresh: mutate,
  };
}
