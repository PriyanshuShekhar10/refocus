/**
 * Server logs → PostHog Logs (OpenTelemetry), plus handled errors → PostHog
 * Error tracking. Installed once from instrumentation.ts (Node.js runtime).
 *
 * The app already logs with console.error/warn/info (e.g. "[email] … failed");
 * those calls are forwarded as-is, so no call sites change. Email addresses in
 * log text are masked before they leave the server.
 */
import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { waitUntil } from "@vercel/functions";
import { inspect } from "node:util";
import { getPostHogServer, isPostHogServerEnabled, POSTHOG_HOST, POSTHOG_KEY } from "./posthog-server";

const EMAIL_RE = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

/** "priya@example.com" → "p***@example.com" */
export function maskEmails(text: string): string {
  return text.replace(EMAIL_RE, "$1***@$2");
}

/** Turn console arguments into one log line, the way console itself would. */
export function formatConsoleArgs(args: unknown[]): string {
  return args
    .map((a) => (typeof a === "string" ? a : a instanceof Error ? a.stack || a.message : inspect(a, { depth: 4, breakLength: Infinity })))
    .join(" ");
}

type Level = "error" | "warn" | "info";
const SEVERITY: Record<Level, SeverityNumber> = {
  error: SeverityNumber.ERROR,
  warn: SeverityNumber.WARN,
  info: SeverityNumber.INFO,
};

let installed = false;

export function installServerLogging(): void {
  if (installed || !isPostHogServerEnabled()) return;
  installed = true;

  const provider = new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": "refocus-dashboard",
      "deployment.environment": process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    }),
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: `${POSTHOG_HOST}/i/v1/logs`,
          headers: { Authorization: `Bearer ${POSTHOG_KEY}`, "Content-Type": "application/json" },
        }),
        scheduledDelayMillis: 500,
      }),
    ],
  });
  const logger = provider.getLogger("refocus-dashboard");

  // Vercel may freeze a function right after the response: keep it alive
  // until pending logs are sent (no-op outside a request).
  let flushQueued = false;
  const queueFlush = () => {
    if (flushQueued) return;
    flushQueued = true;
    queueMicrotask(() => {
      flushQueued = false;
      try {
        waitUntil(provider.forceFlush().catch(() => undefined));
      } catch {
        void provider.forceFlush().catch(() => undefined);
      }
    });
  };

  let forwarding = false; // never forward our own exporter's complaints
  for (const level of ["error", "warn", "info"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      if (forwarding) return;
      forwarding = true;
      try {
        logger.emit({
          severityNumber: SEVERITY[level],
          severityText: level.toUpperCase(),
          body: maskEmails(formatConsoleArgs(args)),
        });
        queueFlush();
        // A caught error that was logged still belongs in Error tracking.
        if (level === "error") {
          const err = args.find((a): a is Error => a instanceof Error);
          if (err) {
            const context = typeof args[0] === "string" ? maskEmails(args[0]).slice(0, 200) : undefined;
            const ph = getPostHogServer();
            if (ph) {
              const sent = ph.captureExceptionImmediate(err, undefined, { $exception_source: "server-log", log_context: context });
              try {
                waitUntil(sent.catch(() => undefined));
              } catch {
                void sent.catch(() => undefined);
              }
            }
          }
        }
      } catch {
        // Logging must never break the request.
      } finally {
        forwarding = false;
      }
    };
  }
}
