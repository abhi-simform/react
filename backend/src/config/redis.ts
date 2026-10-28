import { Redis } from "ioredis"
import { env, redisEnabled } from "./env.js"
import { logger } from "./logger.js"

let client: Redis | null = null

/**
 * The one shared Redis connection (cache + rate limiter). Returns null when REDIS_URL is not set,
 * so callers pick their in-process fallback. BullMQ needs its own connections (see jobs/queue.ts).
 */
export function getRedis(): Redis | null {
  if (!redisEnabled) return null
  if (!client) {
    client = new Redis(env.REDIS_URL!, { maxRetriesPerRequest: 2, lazyConnect: false })
    client.on("error", (err) => logger.warn({ err: err.message }, "Redis error"))
  }
  return client
}

export async function closeRedis() {
  const c = client
  client = null
  await c?.quit().catch(() => c.disconnect())
}
