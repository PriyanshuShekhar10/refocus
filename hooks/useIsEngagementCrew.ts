"use client";

import useSWR from "swr";
import { swrKeys } from "@/lib/swr/keys";

type CrewMeResponse = { isCrew?: boolean };

export function useIsEngagementCrew() {
  const { data, error, isLoading, mutate } = useSWR<CrewMeResponse>(
    swrKeys.crewMe,
  );

  return {
    isCrew: data?.isCrew === true,
    loading: isLoading && data == null,
    error: error ? (error as Error).message : null,
    refresh: mutate,
  };
}
