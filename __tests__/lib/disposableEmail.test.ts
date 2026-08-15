import { describe, it, expect } from "vitest";
import {
  DISPOSABLE_EMAIL_ERROR,
  emailDomain,
  isDisposableEmail,
} from "@/lib/disposableEmail";

describe("disposableEmail", () => {
  it("extracts domain", () => {
    expect(emailDomain("User@Mailinator.COM")).toBe("mailinator.com");
    expect(emailDomain("bad")).toBeNull();
  });

  it("flags known disposable domains", () => {
    expect(isDisposableEmail("abc@mailinator.com")).toBe(true);
    expect(isDisposableEmail("x@guerrillamail.com")).toBe(true);
    expect(isDisposableEmail("x@yopmail.com")).toBe(true);
  });

  it("allows normal providers", () => {
    expect(isDisposableEmail("you@gmail.com")).toBe(false);
    expect(isDisposableEmail("you@outlook.com")).toBe(false);
    expect(isDisposableEmail("student@bits-pilani.ac.in")).toBe(false);
  });

  it("exports a clear error message", () => {
    expect(DISPOSABLE_EMAIL_ERROR.toLowerCase()).toContain("disposable");
  });
});
