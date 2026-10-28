import { useQuery } from "@tanstack/react-query"
import { useId, useRef } from "react"
import { Link } from "react-router"

import { RailErrorBoundary } from "@/components/common/RailErrorBoundary"
import { Button } from "@/components/ui/button"
import { ProductCard, toProductCardVM } from "@/features/catalog"
import { useInView } from "@/hooks/useInView"
import { toApiError } from "@/lib/api/errors"

import type { RailOptions } from "../queries"

type ProductRailProps = {
  title: string
  /** an entry of `railQueries`: the rail owns WHEN it runs, the caller owns WHAT. */
  options: RailOptions
  /** "See all" destination. */
  to?: string
  /** Fetch right away (above the fold) instead of when scrolled near. */
  eager?: boolean
  /** Rendered only when the rail is empty (default: render nothing at all). */
  emptyMessage?: string
}

const CARD_WIDTH = "w-44 sm:w-48"

function RailSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex gap-3 overflow-hidden">
      <span className="sr-only">Loading</span>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className={`${CARD_WIDTH} shrink-0 animate-pulse rounded-lg border p-2 motion-reduce:animate-none`}
        >
          <div className="aspect-square rounded bg-muted" />
          <div className="mt-2 h-4 w-full rounded bg-muted" />
          <div className="mt-1 h-4 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

/**
 * A horizontally scrolling product rail (scroll-snap) that loads ITSELF lazily: its query is
 * `enabled` only after an IntersectionObserver saw the rail come within 300 px of the viewport
 * (`eager` skips that for the first screen), so rails below the fold cost no request until the
 * shopper nears them (Network tab proves it). Each rail owns its three states: skeleton while
 * loading, a compact retry line on error, NOTHING on an empty result: a recommendation rail
 * that has nothing to say must not leave a hole in the page. Keyboard: the cards' links are in
 * the normal tab order (focusing one scrolls it into view) and the arrow buttons scroll by a
 * page; there is no focus trap.
 */
export function ProductRail(props: ProductRailProps) {
  return (
    <RailErrorBoundary label={props.title}>
      <RailInner {...props} />
    </RailErrorBoundary>
  )
}

function RailInner({
  title,
  options,
  to,
  eager,
  emptyMessage,
}: ProductRailProps) {
  const headingId = useId()
  const [ref, inView] = useInView<HTMLElement>({ rootMargin: "300px" })
  const scroller = useRef<HTMLUListElement>(null)
  const query = useQuery({ ...options, enabled: eager || inView })

  function scrollBy(direction: 1 | -1) {
    const el = scroller.current
    if (!el) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: reduce ? "auto" : "smooth",
    })
  }

  const items = query.data?.items ?? []
  if (query.isSuccess && items.length === 0 && !emptyMessage)
    return <section ref={ref} aria-hidden hidden />

  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      className="flex min-h-12 flex-col gap-2"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={headingId} className="text-lg font-medium">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {to && (
            <Link className="text-sm underline" to={to}>
              See all
            </Link>
          )}
          {items.length > 2 && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={`Scroll ${title} left`}
                onClick={() => scrollBy(-1)}
              >
                &lsaquo;
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={`Scroll ${title} right`}
                onClick={() => scrollBy(1)}
              >
                &rsaquo;
              </Button>
            </>
          )}
        </div>
      </div>
      {query.data?.note && (
        <p className="text-xs text-muted-foreground">{query.data.note}</p>
      )}
      {query.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load this section ({toApiError(query.error).message}).{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void query.refetch()}
          >
            Retry
          </button>
        </p>
      ) : query.isSuccess ? (
        items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul
            ref={scroller}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
          >
            {items.map((p) => (
              <li key={p._id} className={`${CARD_WIDTH} shrink-0 snap-start`}>
                <ProductCard product={toProductCardVM(p)} />
              </li>
            ))}
          </ul>
        )
      ) : (
        // Not in view yet (idle) or loading: the same skeleton keeps the page from jumping.
        <RailSkeleton />
      )}
    </section>
  )
}
