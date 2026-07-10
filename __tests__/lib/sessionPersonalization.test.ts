import { describe, expect, it } from "vitest";
import { resolveSessionDisplayName } from "@/lib/sessionPersonalization";

describe("resolveSessionDisplayName", () => {
  const session = {
    owner_id: "owner",
    name: "Chess",
    session_participants: [
      { user_id: "owner", label: "Deep work" },
      { user_id: "partner", label: "Reading" },
    ],
  };

  it("returns the viewer's personal label", () => {
    expect(resolveSessionDisplayName(session, "partner")).toBe("Reading");
    expect(resolveSessionDisplayName(session, "owner")).toBe("Deep work");
  });

  it("does not expose another participant's legacy shared name", () => {
    const legacy = {
      owner_id: "owner",
      name: "Chess",
      session_participants: [{ user_id: "owner" }, { user_id: "partner" }],
    };
    expect(resolveSessionDisplayName(legacy, "partner")).toBeNull();
    expect(resolveSessionDisplayName(legacy, "owner")).toBe("Chess");
  });
});
