import { afterEach, describe, expect, it, vi } from "vitest";

describe("listDailyAccounts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("parses primary and numbered pairs, skipping incomplete ones", async () => {
    vi.stubEnv("DAILY_API_KEY", "key-one");
    vi.stubEnv("DAILY_DOMAIN", "a.daily.co");
    vi.stubEnv("DAILY_API_KEY_2", "key-two");
    vi.stubEnv("DAILY_DOMAIN_2", "b.daily.co");
    vi.stubEnv("DAILY_API_KEY_3", "orphan-key");
    // DOMAIN_3 missing → skipped

    const { listDailyAccounts, listDailyAccountsPublic } = await import(
      "@/lib/dailyAccounts"
    );

    expect(listDailyAccounts()).toEqual([
      { id: "1", apiKey: "key-one", domain: "a.daily.co" },
      { id: "2", apiKey: "key-two", domain: "b.daily.co" },
    ]);
    expect(listDailyAccountsPublic()).toEqual([
      { id: "1", domain: "a.daily.co", keyHint: "…-one" },
      { id: "2", domain: "b.daily.co", keyHint: "…-two" },
    ]);
  });
});
