/**
 * One normal form per typed term: trimmed, single spaces, lower case. It is the request AND the
 * cache key, so "Sams", "sams " and "SAMS" are one entry (and one request).
 */
export const normalizeTerm = (raw: string) =>
  raw.trim().replace(/\s+/g, " ").toLowerCase()

/** The API refuses queries shorter than this (422); the UI does not even ask. */
export const MIN_TERM = 2
