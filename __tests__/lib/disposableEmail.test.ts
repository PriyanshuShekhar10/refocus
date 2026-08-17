import { describe, it, expect } from "vitest";
import {
  DISPOSABLE_EMAIL_ERROR,
  emailDomain,
  isDisposableEmail,
  isListedDisposableEmail,
} from "@/lib/disposableEmail";

describe("disposableEmail", () => {
  it("extracts domain", () => {
    expect(emailDomain("User@Mailinator.COM")).toBe("mailinator.com");
    expect(emailDomain("bad")).toBeNull();
  });

  it("flags known disposable domains", () => {
    expect(isListedDisposableEmail("abc@mailinator.com")).toBe(true);
    expect(isListedDisposableEmail("x@guerrillamail.com")).toBe(true);
    expect(isListedDisposableEmail("x@yopmail.com")).toBe(true);
  });

  it("flags current temp-mail hosts missing from the npm snapshot", () => {
    expect(isListedDisposableEmail("user@mail.tm")).toBe(true);
    expect(isListedDisposableEmail("user@mail.gw")).toBe(true);
    expect(isListedDisposableEmail("user@tempmail.com")).toBe(true);
    expect(isListedDisposableEmail("user@emailnator.com")).toBe(true);
  });

  it("flags subdomains of listed disposable hosts", () => {
    expect(isListedDisposableEmail("x@sub.mailinator.com")).toBe(true);
    expect(isListedDisposableEmail("x@inbox.mail.tm")).toBe(true);
  });

  it("allows normal providers", () => {
    expect(isListedDisposableEmail("you@gmail.com")).toBe(false);
    expect(isListedDisposableEmail("you@outlook.com")).toBe(false);
    expect(isListedDisposableEmail("student@bits-pilani.ac.in")).toBe(false);
  });

  it("async check matches the local list in tests (no live fetch)", async () => {
    await expect(isDisposableEmail("abc@mailinator.com")).resolves.toBe(true);
    await expect(isDisposableEmail("you@gmail.com")).resolves.toBe(false);
  });

  it("exports a clear error message", () => {
    expect(DISPOSABLE_EMAIL_ERROR.toLowerCase()).toContain("disposable");
  });
});
