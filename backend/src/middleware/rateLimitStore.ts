import type { ClientRateLimitInfo, Options, Store } from "express-rate-limit"
import type { Redis } from "ioredis"

/**
 * express-rate-limit counts in process memory by default: two server instances would each allow the
 * full limit, and a restart forgets everyone. This store keeps the counters in Redis (INCR + PEXPIRE
 * in one atomic script) so all instances share one budget. Used only when REDIS_URL is set.
 */
const SCRIPT = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return { c, redis.call('PTTL', KEYS[1]) }
`

export class RedisRateLimitStore implements Store {
  windowMs = 60_000
  constructor(
    private redis: Redis,
    public prefix: string
  ) {}

  init(options: Options) {
    this.windowMs = options.windowMs
  }

  private k = (key: string) => `${this.prefix}:${key}`

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const [hits, ttl] = (await this.redis.eval(
      SCRIPT,
      1,
      this.k(key),
      this.windowMs
    )) as [number, number]
    return {
      totalHits: hits,
      resetTime: new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs)),
    }
  }

  async decrement(key: string) {
    await this.redis.decr(this.k(key))
  }

  async resetKey(key: string) {
    await this.redis.del(this.k(key))
  }
}
