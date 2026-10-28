import { formatCountdown } from "@/lib/duration"

import { useDealExpiry } from "../hooks/useDealExpiry"

/** "Deal ends in 05:59:12" on the PDP. At zero the product refetches and the price reverts. */
export function DealEndsNote({ endsAt }: { endsAt: string }) {
  const countdown = useDealExpiry(endsAt)
  return (
    <p className="text-sm text-amber-800" data-testid="deal-note">
      {countdown.isExpired ? (
        "This deal has ended."
      ) : (
        <>
          Deal ends in{" "}
          <time role="timer" className="font-mono font-semibold">
            {formatCountdown(countdown)}
          </time>
        </>
      )}
    </p>
  )
}
