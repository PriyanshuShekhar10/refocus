import { afterEach, describe, expect, it, vi } from "vitest";

describe("lib/site url helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("getAppUrl prefers NEXT_PUBLIC_APP_URL over marketing site", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://dashboard.refocus.co.in");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://refocus.co.in");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    const { getAppUrl, getMarketingSiteUrl } = await import("@/lib/site");
    expect(getAppUrl()).toBe("https://dashboard.refocus.co.in");
    expect(getMarketingSiteUrl()).toBe("https://refocus.co.in");
  });

  it("getAppUrl falls back to NEXTAUTH_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "https://dashboard.refocus.co.in/");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://refocus.co.in");
    const { getAppUrl } = await import("@/lib/site");
    expect(getAppUrl()).toBe("https://dashboard.refocus.co.in");
  });

  it("strips www from marketing URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.refocus.co.in/");
    const { getMarketingSiteUrl } = await import("@/lib/site");
    expect(getMarketingSiteUrl()).toBe("https://refocus.co.in");
  });

  it("never returns localhost app URL on Vercel production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("APP_URL", "");
    const { getAppUrl } = await import("@/lib/site");
    expect(getAppUrl()).toBe("https://dashboard.refocus.co.in");
  });
});
