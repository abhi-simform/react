import { env } from "../config/env.js"
import { getRedis } from "../config/redis.js"
import { logger } from "../config/logger.js"

/**
 * Read-through JSON cache with two drivers behind one function: Redis when REDIS_URL is set,
 * otherwise a small in-process Map with expiry. A cache failure is never an API failure: every
 * Redis call is wrapped, and on error we just run the loader.
 *
 * Invalidation is by VERSION, not by deleting keys: every key embeds `ns:version`, and
 * `invalidate(ns)` bumps the version, so the old entries become unreachable and expire by TTL.
 * That works the same in memory and Redis and needs no key scanning.
 */
type Entry = { value: string; expires: number }
const memory = new Map<string, Entry>()
const versions = new Map<string, number>()
const MAX_MEMORY_ENTRIES = 500

export const stats = { hits: 0, misses: 0 }

async function currentVersion(ns: string): Promise<string> {
  const redis = getRedis()
  if (redis) {
    try {
      return (await redis.get(`cache:v:${ns}`)) ?? "0"
    } catch {
      return "0"
    }
  }
  return String(versions.get(ns) ?? 0)
}

export async function invalidate(ns: string) {
  const redis = getRedis()
  if (redis) {
    try {
      await redis.incr(`cache:v:${ns}`)
    } catch (err) {
      logger.warn({ err }, "cache invalidate failed")
    }
  }
  versions.set(ns, (versions.get(ns) ?? 0) + 1)
}

export async function cached<T>(
  ns: string,
  key: string,
  loader: () => Promise<T>,
  ttlSeconds = env.CACHE_TTL_SECONDS
): Promise<T> {
  if (!env.CACHE_ENABLED) return loader()
  const full = `cache:${ns}:${await currentVersion(ns)}:${key}`
  const redis = getRedis()
  try {
    const hit = redis ? await redis.get(full) : readMemory(full)
    if (hit != null) {
      stats.hits++
      return JSON.parse(hit) as T
    }
  } catch (err) {
    logger.warn({ err }, "cache read failed")
  }
  stats.misses++
  const value = await loader()
  const json = JSON.stringify(value)
  try {
    if (redis) await redis.set(full, json, "EX", ttlSeconds)
    else writeMemory(full, json, ttlSeconds)
  } catch (err) {
    logger.warn({ err }, "cache write failed")
  }
  return value
}

function readMemory(key: string) {
  const e = memory.get(key)
  if (!e) return null
  if (e.expires < Date.now()) {
    memory.delete(key)
    return null
  }
  return e.value
}

function writeMemory(key: string, value: string, ttlSeconds: number) {
  if (memory.size >= MAX_MEMORY_ENTRIES) {
    // Cheap bound: drop the oldest-inserted entry (Map keeps insertion order).
    memory.delete(memory.keys().next().value as string)
  }
  memory.set(key, { value, expires: Date.now() + ttlSeconds * 1000 })
}

export const cacheDriver = () => (getRedis() ? "redis" : "memory")
/** Test helper. */
export function clearMemoryCache() {
  memory.clear()
  versions.clear()
  stats.hits = 0
  stats.misses = 0
}
