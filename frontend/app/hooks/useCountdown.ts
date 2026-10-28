import { splitDuration, type Duration } from "@/lib/duration"

import { useNow } from "./useNow"

export type Countdown = Duration & {
  remainingMs: number
  isExpired: boolean
}

/**
 * Time left until `endsAt`, computed from the clock, never by subtracting a
 * second per tick: timers drift and are throttled in background tabs, but
 * `end - now` is right whenever it is evaluated.
 *
 * `serverOffsetMs` = serverTime - clientTime, measured once. The deal ends at
 * a SERVER moment, so the client's "now" is corrected by the offset; and the
 * ticking stops when the corrected clock passes `endsAt`.
 */
export function useCountdown(
  endsAt: number | string | Date,
  opts: { serverOffsetMs?: number; tickMs?: number } = {}
): Countdown {
  const { serverOffsetMs = 0, tickMs = 1000 } = opts
  const endMs = new Date(endsAt).getTime()
  // An invalid date counts as "ended long ago" (0 = 1970): nothing to tick.
  const stopAt = Number.isNaN(endMs) ? 0 : endMs - serverOffsetMs
  const now = useNow(tickMs, stopAt)

  const remainingMs = Number.isNaN(endMs)
    ? 0
    : Math.max(0, endMs - (now + serverOffsetMs))
  return {
    remainingMs,
    isExpired: remainingMs === 0,
    ...splitDuration(remainingMs),
  }
}
