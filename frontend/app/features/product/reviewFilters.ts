import type { ReviewFilter, ReviewSort } from "./reviews.api"

/**
 * The review filters live in the URL (`?tab=reviews&reviews=4&rsort=helpful&rphotos=1`): a link
 * can point at "all 1-star reviews", a refresh keeps them, Back undoes them. Defaults are NOT
 * written (no param = helpful, no star filter, no photo filter) so the canonical URL stays clean.
 */
const SORTS: readonly ReviewSort[] = ["helpful", "newest", "highest", "lowest"]
export const SORT_LABELS: Record<ReviewSort, string> = {
  helpful: "Most helpful",
  newest: "Newest",
  highest: "Highest rated",
  lowest: "Lowest rated",
}

export function parseReviewFilter(params: URLSearchParams): ReviewFilter {
  const star = Number(params.get("reviews"))
  const sort = params.get("rsort")
  return {
    rating:
      Number.isInteger(star) && star >= 1 && star <= 5
        ? (star as 1 | 2 | 3 | 4 | 5)
        : undefined,
    sort: SORTS.find((s) => s === sort) ?? "helpful",
    photos: params.get("rphotos") === "1",
  }
}

export function withReviewFilter(
  current: URLSearchParams,
  next: Partial<ReviewFilter>
): URLSearchParams {
  const merged = { ...parseReviewFilter(current), ...next }
  const out = new URLSearchParams(current)
  const set = (key: string, value: string | undefined) =>
    value === undefined ? out.delete(key) : out.set(key, value)
  set("reviews", merged.rating ? String(merged.rating) : undefined)
  set("rsort", merged.sort === "helpful" ? undefined : merged.sort)
  set("rphotos", merged.photos ? "1" : undefined)
  return out
}
