import { describe, it, expect } from "vitest";
import { DASHBOARD_TABS, showsRightSidebar, tabFromParam, urlForTab } from "@/lib/dashboardTabs";

describe("tabFromParam", () => {
  it.each(DASHBOARD_TABS)("accepts %s", (tab) => {
    expect(tabFromParam(tab, { isAdmin: false })).toBe(tab);
  });

  it("returns null for missing or unknown values", () => {
    expect(tabFromParam(null, { isAdmin: true })).toBeNull();
    expect(tabFromParam("", { isAdmin: true })).toBeNull();
    expect(tabFromParam("nope", { isAdmin: true })).toBeNull();
    expect(tabFromParam("backlog", { isAdmin: true })).toBeNull();
  });

  it("only opens admin for admins", () => {
    expect(tabFromParam("admin", { isAdmin: false })).toBeNull();
    expect(tabFromParam("admin", { isAdmin: true })).toBe("admin");
  });
});

describe("urlForTab", () => {
  it("keeps the calendar at plain /dashboard", () => {
    expect(urlForTab("dashboard")).toBe("/dashboard");
  });

  it.each(["sessions", "friends", "community", "settings", "profile", "matches", "admin"] as const)(
    "puts %s in ?tab=",
    (tab) => {
      expect(urlForTab(tab)).toBe(`/dashboard?tab=${tab}`);
      expect(tabFromParam(new URL(urlForTab(tab), "http://x").searchParams.get("tab"), { isAdmin: true })).toBe(tab);
    },
  );
});

describe("showsRightSidebar", () => {
  it("shows beside every section except admin", () => {
    for (const tab of DASHBOARD_TABS) expect(showsRightSidebar(tab)).toBe(true);
    expect(showsRightSidebar("admin")).toBe(false);
  });
});

describe("profileHref", () => {
  it("opens someone's profile inside the dashboard", async () => {
    const { profileHref } = await import("@/lib/dashboardTabs");
    expect(profileHref("priyanshu")).toBe("/dashboard?tab=user&u=priyanshu");
    const url = new URL(profileHref("a b&c"), "http://x");
    expect(url.searchParams.get("tab")).toBe("user");
    expect(url.searchParams.get("u")).toBe("a b&c");
    expect(tabFromParam(url.searchParams.get("tab"), { isAdmin: false })).toBe("user");
  });
});
