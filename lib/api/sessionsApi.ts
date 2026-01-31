/**
 * Sessions API layer – centralizes all /api/sessions calls.
 * Each method returns { ok, data?, error? }; callers can throw ApiError for consistent handling.
 */

import type { FetchedSession } from "@/types/calendar";
import type { DurationMin, SessionType } from "@/constants/calendar";

// ============================================
// Types
// ============================================

export type ApiResult<T> =
  | { ok: true; data: T; error?: never }
  | { ok: false; data?: never; error: string };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ListSessionsPayload = {
  currentUserId: string | null;
  sessions: FetchedSession[];
};

export type CreateSessionPayload = { id: string };

export type PatchSessionPayload = Partial<Pick<FetchedSession, "name" | "color">>;

// ============================================
// Helpers
// ============================================

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string") {
    return (data as { error: string }).error;
  }
  return fallback;
}

// ============================================
// API methods
// ============================================

const BASE = "/api/sessions";

/**
 * GET /api/sessions?from=ISO&to=ISO
 */
export async function list(
  from: string,
  to: string,
): Promise<ApiResult<ListSessionsPayload>> {
  const url = `${BASE}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const res = await fetch(url);
  const data = await parseJson(res);

  if (!res.ok) {
    return {
      ok: false,
      error: getErrorMessage(data, res.statusText || "Failed to load sessions"),
    };
  }

  const payload = (data || {}) as {
    currentUserId?: string | null;
    sessions?: FetchedSession[];
  };
  return {
    ok: true,
    data: {
      currentUserId: payload.currentUserId ?? null,
      sessions: payload.sessions ?? [],
    },
  };
}

/**
 * POST /api/sessions – create a session
 */
export async function create(params: {
  start: string;
  durationMin: DurationMin;
  sessionType: SessionType;
  quietOwner?: boolean;
}): Promise<ApiResult<CreateSessionPayload>> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start: params.start,
      durationMin: params.durationMin,
      sessionType: params.sessionType,
      quietOwner: params.quietOwner ?? false,
    }),
  });
  const data = await parseJson(res);

  if (!res.ok) {
    return {
      ok: false,
      error: getErrorMessage(data, "Failed to create session"),
    };
  }

  const id = (data as { id?: string } | null)?.id;
  if (!id) {
    return { ok: false, error: "Invalid response: missing id" };
  }
  return { ok: true, data: { id } };
}

/**
 * POST /api/sessions/:id/join – join/book a session
 */
export async function join(
  id: string,
  quiet?: boolean,
): Promise<ApiResult<Record<string, never>>> {
  const res = await fetch(`${BASE}/${id}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quiet: quiet ?? false }),
  });
  const data = await parseJson(res);

  if (!res.ok) {
    return {
      ok: false,
      error: getErrorMessage(data, "Failed to join session"),
    };
  }
  return { ok: true, data: {} };
}

/**
 * POST /api/sessions/:id/leave – leave a session (participant only; session stays available for owner)
 */
export async function leave(
  id: string,
): Promise<ApiResult<Record<string, never>>> {
  const res = await fetch(`${BASE}/${id}/leave`, { method: "POST" });
  const data = await parseJson(res);

  if (!res.ok) {
    return {
      ok: false,
      error: getErrorMessage(data, "Failed to leave session"),
    };
  }
  return { ok: true, data: {} };
}

/**
 * DELETE /api/sessions/:id – owner deletes; if session has 2 participants, transfers ownership to the other person
 */
export async function deleteSession(
  id: string,
): Promise<ApiResult<Record<string, never>>> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  const data = await parseJson(res);

  if (!res.ok) {
    return {
      ok: false,
      error: getErrorMessage(data, "Failed to delete session"),
    };
  }
  return { ok: true, data: {} };
}

/**
 * PATCH /api/sessions/:id – update name/color
 */
export async function patch(
  id: string,
  body: PatchSessionPayload,
): Promise<ApiResult<Record<string, never>>> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);

  if (!res.ok) {
    return {
      ok: false,
      error: getErrorMessage(data, "Failed to update session"),
    };
  }
  return { ok: true, data: {} };
}

// Optional: throw helpers for callers that prefer try/catch
export function assertOk<T>(result: ApiResult<T>): asserts result is { ok: true; data: T } {
  if (!result.ok) {
    throw new ApiError(result.error);
  }
}
