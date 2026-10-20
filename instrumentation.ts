/**
 * Next.js instrumentation: server logs → PostHog Logs, and unhandled server
 * errors → PostHog Error tracking (linked to the visitor's session replay).
 * Node.js runtime only; the edge middleware is left alone.
 */
import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { installServerLogging } = await import("./lib/observability/logs");
  installServerLogging();
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { getPostHogServer, posthogIdentityFromCookie } = await import("./lib/observability/posthog-server");
    const posthog = getPostHogServer();
    if (!posthog) return;
    const cookie = request.headers.cookie;
    const { distinctId, sessionId } = posthogIdentityFromCookie(Array.isArray(cookie) ? cookie.join("; ") : cookie);
    await posthog.captureExceptionImmediate(err, distinctId, {
      $exception_source: "server",
      ...(sessionId ? { $session_id: sessionId } : {}),
      $pathname: request.path.split("?")[0],
      http_method: request.method,
      route_path: context.routePath,
      route_type: context.routeType,
      router_kind: context.routerKind,
      render_source: (context as { renderSource?: string }).renderSource,
      error_digest: (err as { digest?: string }).digest,
    });
  } catch {
    // Reporting must never mask the original error.
  }
};
