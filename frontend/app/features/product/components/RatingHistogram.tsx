import { cn } from "@/lib/utils"

import type { ReviewSummary } from "../reviews.schemas"

/**
 * The bars come from the API's counts (never recomputed from the visible page). Each row is a
 * button that filters the list to that star count (a second click clears it); `aria-pressed`
 * says which one is active, and the bar width is decoration (the numbers are real text).
 */
export function RatingHistogram({
  summary,
  active,
  onSelect,
}: {
  summary: ReviewSummary
  active?: number
  onSelect: (star: 1 | 2 | 3 | 4 | 5 | undefined) => void
}) {
  return (
    <ul aria-label="Ratings by star" className="flex flex-col gap-1">
      {([5, 4, 3, 2, 1] as const).map((star) => {
        const n = summary.histogram[star]
        const pct = summary.count ? Math.round((n / summary.count) * 100) : 0
        return (
          <li key={star}>
            <button
              type="button"
              aria-pressed={active === star}
              aria-label={`${star} star: ${n} review${n === 1 ? "" : "s"}${active === star ? " (filter on)" : ""}`}
              disabled={n === 0}
              onClick={() => onSelect(active === star ? undefined : star)}
              className={cn(
                "grid w-full grid-cols-[3rem_1fr_3rem] items-center gap-2 rounded px-1 text-xs hover:bg-muted disabled:opacity-50",
                active === star && "bg-muted font-medium"
              )}
            >
              <span aria-hidden>{star} ★</span>
              <span
                aria-hidden
                className="h-2 overflow-hidden rounded bg-muted"
              >
                <span
                  className="block h-full bg-warning"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span aria-hidden className="text-right">
                {n}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
