"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { swrKeys } from "@/lib/swr/keys";
import {
  DEFAULT_SESSION_REMINDER_TIMING,
  type SessionReminderTiming,
} from "@/lib/sessionReminderPrefs";

export type UserPreferences = {
  defaultSessionLength: 25 | 50 | 75;
  focusModeDefault: boolean;
  publicProfile: boolean;
  allowFriendRequests: boolean;
  showInGlobalChat: boolean;
  showFullLastNames: boolean;
  emailSessionReminders: boolean;
  sessionReminderTiming: SessionReminderTiming;
  emailFriendRequests: boolean;
  emailWeeklyDigest: boolean;
  emailCommunityMentions: boolean;
  pushSessionReminders: boolean;
  pushFriendRequests: boolean;
  pushChatMessages: boolean;
  /** "auto" = device timezone; otherwise an IANA timezone id */
  timezone: string;
  /** Custom dashboard background image URL, or null for default grid */
  dashboardWallpaperUrl: string | null;
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultSessionLength: 50,
  focusModeDefault: true,
  publicProfile: true,
  allowFriendRequests: true,
  showInGlobalChat: true,
  showFullLastNames: false,
  emailSessionReminders: true,
  sessionReminderTiming: DEFAULT_SESSION_REMINDER_TIMING,
  emailFriendRequests: false,
  emailWeeklyDigest: false,
  emailCommunityMentions: true,
  pushSessionReminders: true,
  pushFriendRequests: true,
  pushChatMessages: true,
  timezone: "auto",
  dashboardWallpaperUrl: null,
};

type PreferencesResponse = { preferences?: Partial<UserPreferences> };

/**
 * Shared cache for GET /api/users/preferences. Several settings sections and
 * the dashboard wallpaper all need this; reading it through one SWR key
 * instead of each doing its own fetch keeps it to a single request instead
 * of one per consumer.
 */
export function useUserPreferences() {
  const { data, error, isLoading, mutate } = useSWR<PreferencesResponse>(
    swrKeys.userPreferences,
  );
  const [saving, setSaving] = useState(false);

  const preferences: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    ...data?.preferences,
  };

  const setPreference = useCallback(
    async <K extends keyof UserPreferences>(
      key: K,
      value: UserPreferences[K],
    ) => {
      const previous = { ...DEFAULT_PREFERENCES, ...data?.preferences }[key];
      await mutate(
        (current) => ({
          preferences: { ...(current?.preferences ?? data?.preferences), [key]: value },
        }),
        { revalidate: false },
      );
      setSaving(true);
      try {
        const res = await fetch("/api/users/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        });
        if (!res.ok) throw new Error("save failed");
      } catch {
        await mutate(
          (current) => ({
            preferences: { ...(current?.preferences ?? data?.preferences), [key]: previous },
          }),
          { revalidate: false },
        );
      } finally {
        setSaving(false);
      }
    },
    [mutate, data?.preferences],
  );

  return {
    preferences,
    loading: isLoading && data == null,
    error: error ? (error as Error).message : null,
    mutate,
    setPreference,
    saving,
  };
}
