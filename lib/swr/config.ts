import type { SWRConfiguration } from "swr";
import { jsonFetcher } from "./fetcher";

/** Default SWR options: show cached data immediately, refresh in background. */
export const defaultSwrConfig: SWRConfiguration = {
  fetcher: jsonFetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5_000,
  focusThrottleInterval: 10_000,
  keepPreviousData: true,
  errorRetryCount: 2,
};
