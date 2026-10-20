import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const emit = vi.fn();
const forceFlush = vi.fn().mockResolvedValue(undefined);
const captureExceptionImmediate = vi.fn().mockResolvedValue(undefined);

vi.mock("@opentelemetry/sdk-logs", () => ({
  LoggerProvider: class {
    getLogger() {
      return { emit };
    }
    forceFlush() {
      return forceFlush();
    }
  },
  BatchLogRecordProcessor: class {},
}));
vi.mock("@opentelemetry/exporter-logs-otlp-http", () => ({ OTLPLogExporter: class {} }));
vi.mock("@opentelemetry/resources", () => ({ resourceFromAttributes: vi.fn(() => ({})) }));
vi.mock("@vercel/functions", () => ({ waitUntil: vi.fn() }));

const enabled = { value: true };
vi.mock("@/lib/observability/posthog-server", async (orig) => ({
  ...(await orig<object>()),
  isPostHogServerEnabled: () => enabled.value,
  getPostHogServer: () => ({ captureExceptionImmediate }),
}));

import { posthogIdentityFromCookie, posthogCookieName } from "@/lib/observability/posthog-server";
import { formatConsoleArgs, maskEmails } from "@/lib/observability/logs";

describe("posthogIdentityFromCookie", () => {
  const key = "phc_test";
  const cookieFor = (value: unknown) =>
    `other=1; ${posthogCookieName(key)}=${encodeURIComponent(JSON.stringify(value))}; x=y`;

  it("reads the distinct id and session id from the browser SDK's cookie", () => {
    expect(posthogIdentityFromCookie(cookieFor({ distinct_id: "user-1", $sesid: [1, "sess-9", 2] }), key)).toEqual({
      distinctId: "user-1",
      sessionId: "sess-9",
    });
  });

  it("returns nothing for a missing or garbled cookie", () => {
    expect(posthogIdentityFromCookie(undefined, key)).toEqual({});
    expect(posthogIdentityFromCookie("a=b", key)).toEqual({});
    expect(posthogIdentityFromCookie(`${posthogCookieName(key)}=%7Bnot-json`, key)).toEqual({});
  });
});

describe("log formatting", () => {
  it("masks email addresses", () => {
    expect(maskEmails("[email] match email failed for priya@example.com")).toBe(
      "[email] match email failed for p***@example.com",
    );
  });

  it("formats console arguments like console does", () => {
    const err = new Error("boom");
    expect(formatConsoleArgs(["[x]", { a: 1 }, 3])).toBe("[x] { a: 1 } 3");
    expect(formatConsoleArgs([err])).toContain("Error: boom");
  });
});

describe("installServerLogging", () => {
  const originals = { error: console.error, warn: console.warn, info: console.info };
  const printed = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    emit.mockClear();
    captureExceptionImmediate.mockClear();
    printed.mockClear();
    console.error = (...a: unknown[]) => printed("error", ...a);
    console.warn = (...a: unknown[]) => printed("warn", ...a);
    console.info = (...a: unknown[]) => printed("info", ...a);
  });
  afterEach(() => Object.assign(console, originals));

  it("still prints, forwards each level to PostHog Logs with emails masked, and reports logged errors", async () => {
    enabled.value = true;
    const { installServerLogging } = await import("@/lib/observability/logs");
    installServerLogging();

    console.warn("[email] sandbox: cannot send to priya@example.com");
    console.info("started");
    const err = new Error("Daily token failed");
    console.error("[VideoToken] Failed to create token", err);

    expect(printed).toHaveBeenCalledTimes(3);
    expect(emit).toHaveBeenCalledTimes(3);
    expect(emit.mock.calls[0][0]).toMatchObject({ severityText: "WARN", body: "[email] sandbox: cannot send to p***@example.com" });
    expect(emit.mock.calls[1][0]).toMatchObject({ severityText: "INFO", body: "started" });
    expect(emit.mock.calls[2][0].severityText).toBe("ERROR");
    expect(captureExceptionImmediate).toHaveBeenCalledWith(err, undefined, expect.objectContaining({
      $exception_source: "server-log",
      log_context: "[VideoToken] Failed to create token",
    }));
  });

  it("does nothing when PostHog isn't configured", async () => {
    enabled.value = false;
    const { installServerLogging } = await import("@/lib/observability/logs");
    installServerLogging();
    console.error("x", new Error("y"));
    expect(printed).toHaveBeenCalledTimes(1);
    expect(emit).not.toHaveBeenCalled();
    expect(captureExceptionImmediate).not.toHaveBeenCalled();
  });
});
