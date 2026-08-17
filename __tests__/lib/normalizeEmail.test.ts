import { describe, it, expect } from "vitest";
import { canonicalEmail, displayEmail } from "@/lib/normalizeEmail";
import { persistableIp } from "@/lib/userIps";

describe("canonicalEmail", () => {
  it("collapses Gmail plus tags and dots", () => {
    expect(canonicalEmail("User+x@Gmail.com")).toBe("user@gmail.com");
    expect(canonicalEmail("u.s.er@googlemail.com")).toBe("user@gmail.com");
  });

  it("strips Outlook plus tags but not university emails", () => {
    expect(canonicalEmail("name+tag@outlook.com")).toBe("name@outlook.com");
    expect(canonicalEmail("student@bits-pilani.ac.in")).toBe(
      "student@bits-pilani.ac.in",
    );
  });

  it("displayEmail only lowercases", () => {
    expect(displayEmail("TeSt@Example.COM")).toBe("test@example.com");
  });
});

describe("persistableIp", () => {
  it("drops loopback and keeps public IPs", () => {
    expect(persistableIp("127.0.0.1")).toBeNull();
    expect(persistableIp("::1")).toBeNull();
    expect(persistableIp("203.0.113.10")).toBe("203.0.113.10");
  });
});
