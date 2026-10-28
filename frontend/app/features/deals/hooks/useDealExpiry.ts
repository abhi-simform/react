import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { useCountdown, type Countdown } from "@/hooks/useCountdown"
import { cartKeys, dealKeys, productKeys } from "@/lib/queryKeys"

import { useServerTimeOffset } from "./useServerTimeOffset"

/**
 * A countdown to a deal's end that does the right thing at zero (11.2): the API is the authority
 * on what the price is now, so when the (server-corrected) clock passes `endsAt` the product,
 * deal and cart queries are refetched and the page shows the non-deal price. Runs once per
 * transition into "expired" (the effect depends on the boolean).
 */
export function useDealExpiry(endsAt: string | number): Countdown {
  const serverOffsetMs = useServerTimeOffset()
  const countdown = useCountdown(endsAt, { serverOffsetMs })
  const queryClient = useQueryClient()
  const expired = countdown.isExpired
  useEffect(() => {
    if (!expired) return
    void queryClient.invalidateQueries({ queryKey: dealKeys.all })
    void queryClient.invalidateQueries({ queryKey: productKeys.all })
    void queryClient.invalidateQueries({ queryKey: cartKeys.all })
  }, [expired, queryClient])
  return countdown
}
