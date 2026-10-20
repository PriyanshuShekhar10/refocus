import { describe, it, expect } from "vitest";
import { resolveSidebarCollapsed, SIDEBAR_AUTO_COLLAPSE_BELOW } from "@/hooks/useSidebarCollapse";

describe("resolveSidebarCollapsed", () => {
  it("minimises automatically on narrow screens and expands on wide ones", () => {
    expect(resolveSidebarCollapsed(null, SIDEBAR_AUTO_COLLAPSE_BELOW - 1)).toBe(true);
    expect(resolveSidebarCollapsed(null, SIDEBAR_AUTO_COLLAPSE_BELOW)).toBe(false);
    expect(resolveSidebarCollapsed(null, 1920)).toBe(false);
  });

  it("keeps a manual expand even on a narrow screen", () => {
    expect(resolveSidebarCollapsed("expanded", 1100)).toBe(false);
  });

  it("keeps a manual collapse even on a wide screen", () => {
    expect(resolveSidebarCollapsed("collapsed", 1920)).toBe(true);
  });
});
