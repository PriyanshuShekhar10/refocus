import { describe, it, expect } from "vitest";
import { validatePassword } from "@/lib/validatePassword";

describe("validatePassword", () => {
  describe("strength classification", () => {
    it("returns 'weak' for a short password", () => {
      const result = validatePassword("abc");
      expect(result.strength).toBe("weak");
      expect(result.requirements.length).toBe(false);
    });

    it("returns 'weak' for a password with only lowercase", () => {
      const result = validatePassword("abcdefgh");
      expect(result.strength).toBe("weak");
      expect(result.requirements.lowercase).toBe(true);
      expect(result.requirements.length).toBe(true);
      expect(result.requirements.uppercase).toBe(false);
      expect(result.requirements.number).toBe(false);
      expect(result.requirements.specialChar).toBe(false);
    });

    it("returns 'medium' for a password meeting 3 requirements", () => {
      const result = validatePassword("Abcdefgh1");
      expect(result.strength).toBe("medium");
      expect(result.requirements.length).toBe(true);
      expect(result.requirements.uppercase).toBe(true);
      expect(result.requirements.lowercase).toBe(true);
      expect(result.requirements.number).toBe(true);
    });

    it("returns 'strong' for a password meeting all 5 requirements", () => {
      const result = validatePassword("Abcdefg1!");
      expect(result.strength).toBe("strong");
      expect(Object.values(result.requirements).every(Boolean)).toBe(true);
    });
  });

  describe("individual requirements", () => {
    it("rejects passwords over 128 characters", () => {
      const result = validatePassword("A1!" + "a".repeat(126));
      expect(result.requirements.length).toBe(false);
    });

    it("detects special characters", () => {
      expect(validatePassword("a@").requirements.specialChar).toBe(true);
      expect(validatePassword("a#").requirements.specialChar).toBe(true);
      expect(validatePassword("a$").requirements.specialChar).toBe(true);
      expect(validatePassword("a!").requirements.specialChar).toBe(true);
    });

    it("detects uppercase letters", () => {
      expect(validatePassword("A").requirements.uppercase).toBe(true);
      expect(validatePassword("a").requirements.uppercase).toBe(false);
    });

    it("detects numbers", () => {
      expect(validatePassword("1").requirements.number).toBe(true);
      expect(validatePassword("a").requirements.number).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const result = validatePassword("");
      expect(result.strength).toBe("weak");
      expect(Object.values(result.requirements).every((v) => v === false)).toBe(true);
    });

    it("handles exactly 8 characters", () => {
      expect(validatePassword("12345678").requirements.length).toBe(true);
    });

    it("handles exactly 128 characters", () => {
      expect(validatePassword("a".repeat(128)).requirements.length).toBe(true);
    });

    it("handles 129 characters", () => {
      expect(validatePassword("a".repeat(129)).requirements.length).toBe(false);
    });
  });
});
