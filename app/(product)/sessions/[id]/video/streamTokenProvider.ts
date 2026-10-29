/**
 * Builds a Stream `tokenProvider` (re-fetches a fresh token on demand)
 * instead of handing the SDKs a static token that can go stale — the issued
 * token's expiry lines up with the session's wrap-up boundary, exactly the
 * window a reconnect is most likely to happen in. Shared by the video
 * client and the chat client; both accept the same user token.
 *
 * Safe to call repeatedly: POST /api/sessions/[id]/video/token re-runs
 * issueSessionVideoJoin, which is idempotent (getOrCreate/update/
 * updateCallMembers), and its attendance-tracking write is guarded by
 * call_joined_at: { $exists: false }.
 */
export function createStreamTokenProvider(sessionId: string): () => Promise<string> {
  return async () => {
    const res = await fetch(`/api/sessions/${sessionId}/video/token`, { method: "POST" });
    if (!res.ok) throw new Error(`Failed to refresh video token: ${res.status}`);
    const data = (await res.json()) as { token?: string };
    if (!data.token) throw new Error("Token refresh response missing token");
    return data.token;
  };
}
