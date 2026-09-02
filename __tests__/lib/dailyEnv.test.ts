import { afterEach, describe, expect, it, vi } from "vitest";

describe("dailyEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("lists all configured Daily domains from env pairs", async () => {
    vi.stubEnv("DAILY_API_KEY", "key-one");
    vi.stubEnv("DAILY_DOMAIN", "a.daily.co");
    vi.stubEnv("DAILY_API_KEY_2", "key-two");
    vi.stubEnv("DAILY_DOMAIN_2", "b.daily.co");

    const { listDailyDomainsFromEnv, listDailyOriginsFromEnv } = await import(
      "@/lib/dailyEnv"
    );

    expect(listDailyDomainsFromEnv()).toEqual(["a.daily.co", "b.daily.co"]);
    expect(listDailyOriginsFromEnv()).toEqual([
      "https://a.daily.co",
      "https://b.daily.co",
    ]);
  });
});
