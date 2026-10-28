/**
 * Stub (4.6): returns 0, "client clock is right". Stage 11 (B4) replaces it
 * with `serverTime - clientTime` measured once from the time endpoint (and
 * corrected for the request's round trip).
 */
export function useServerTimeOffset(): number {
  return 0
}
