import { formatDate } from "@/lib/format"

import type { Serviceable } from "./schemas"

/** "Delivery in 1-2 days, Thu 29 Oct to Fri 30 Oct" (the API gives ISO dates and a day range). */
export function describeEta(result: Serviceable): string {
  const { min, max } = result.deliveryDays
  const days =
    min === max ? `${min} day${min > 1 ? "s" : ""}` : `${min}-${max} days`
  const day = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: undefined, // formatDate adds a year by default
  } as const
  const from = formatDate(result.estimatedDelivery.from, day)
  const to = formatDate(result.estimatedDelivery.to, day)
  return `Delivery in ${days} (${from === to ? from : `${from} to ${to}`})`
}
