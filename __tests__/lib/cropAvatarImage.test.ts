import { describe, expect, it } from "vitest";
import { clampCropOffset } from "@/lib/cropAvatarImage";

describe("clampCropOffset", () => {
  it("keeps offset at zero when image exactly covers crop at zoom 1", () => {
    const result = clampCropOffset(0, 0, 400, 400, 200, 1);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("clamps horizontal pan when zoomed in", () => {
    const result = clampCropOffset(500, 0, 400, 400, 200, 2);
    expect(result.x).toBeLessThan(500);
    expect(result.x).toBeGreaterThan(0);
    expect(result.y).toBe(0);
  });
});
