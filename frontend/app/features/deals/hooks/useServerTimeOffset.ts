import { useQuery } from "@tanstack/react-query"

import { dealQueries } from "../queries"

/**
 * `serverTime - clientTime` in ms (11.2). Measured from `GET /time` ONCE (`staleTime: Infinity`)
 * and again whenever the tab regains focus (`refetchOnWindowFocus: "always"` ignores staleness):
 * a laptop that slept, or a user who changed the OS clock, is corrected without a reload.
 * Until the first answer it is 0 (the client clock), so a countdown never waits for the network.
 * Feed it to `useCountdown(endsAt, { serverOffsetMs })`.
 */
export function useServerTimeOffset(): number {
  const { data } = useQuery({
    ...dealQueries.serverOffset(),
    refetchOnWindowFocus: "always",
  })
  return data ?? 0
}
