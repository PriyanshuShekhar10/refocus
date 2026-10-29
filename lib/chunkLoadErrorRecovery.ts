const RELOAD_FLAG = "rf_chunk_reload_attempted";

/**
 * A stale chunk hash left over from a deploy that's since shipped — the
 * already-loaded bundle can't fetch it again. The error boundaries' own
 * reset() just re-renders the same stale bundle and hits the identical
 * error; a real reload fetches the current HTML/chunk manifest and
 * actually resolves it. Reloads at most once per session (guarded via
 * sessionStorage) so a reload that somehow hits the same stale state
 * doesn't loop forever.
 */
export function recoverFromChunkLoadError(error: Error): void {
  const isChunkLoadError =
    error.name === "ChunkLoadError" || /Loading chunk .* failed/.test(error.message);
  if (!isChunkLoadError || typeof window === "undefined") return;

  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    // sessionStorage unavailable (e.g. private browsing) — still safe to reload once.
  }
  window.location.reload();
}
