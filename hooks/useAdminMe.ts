"use client";

import useSWR from "swr";
import { swrKeys } from "@/lib/swr/keys";

type AdminMeResponse = { isAdmin?: boolean };

export function useAdminMe() {
  const { data, error, isLoading, mutate } = useSWR<AdminMeResponse>(
    swrKeys.adminMe,
  );

  return {
    isAdmin: data?.isAdmin === true,
    loading: isLoading && data == null,
    error: error ? (error as Error).message : null,
    refresh: mutate,
  };
}
