import { useQuery } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { ResponsiveImage } from "@/components/common/ResponsiveImage"
import { safeImageSrc } from "@/lib/safeUrl"
import { cn } from "@/lib/utils"

import { homeQueries } from "../queries"
import type { Banner } from "../schemas"

const AUTOPLAY_MS = 6000
const sitePath = (v: string) => (/^\/(?![/\\])\S*$/.test(v) ? v : "/")

/**
 * The hero banners (B4), as a CAROUSEL pattern (WAI-ARIA APG):
 * - scroll-snap track: swipe/drag/trackpad work natively, no pointer code; prev/next buttons and
 *   dots scroll it (`scrollTo`), and the active slide is derived from `scrollLeft` (one source of
 *   truth: the scroll position, so swipe and buttons cannot disagree);
 * - `aria-roledescription="carousel"` / `"slide"`, each slide "N of M";
 * - autoplay only when it is welcome: never with `prefers-reduced-motion`, paused while the
 *   pointer is over it or focus is inside it, while the tab is hidden, and a visible Pause button
 *   (WCAG 2.2.2) stops it for good. While it autoplays the live region is `off` (a changing
 *   slide must not interrupt a screen reader), otherwise `polite`.
 */
export function HeroCarousel() {
  const q = useQuery(homeQueries.banners("hero"))
  const banners = q.data ?? []
  if (q.isPending)
    return (
      <div
        role="status"
        aria-busy="true"
        className="aspect-[3/1] min-h-40 w-full animate-pulse rounded-lg bg-neutral-200 motion-reduce:animate-none"
      >
        <span className="sr-only">Loading featured offers</span>
      </div>
    )
  if (q.isError || banners.length === 0) return null // a missing banner never breaks the page
  return <Carousel banners={banners} />
}

function Carousel({ banners }: { banners: Banner[] }) {
  const track = useRef<HTMLDivElement>(null)
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)")
  const [active, setActive] = useState(0)
  const [userPaused, setUserPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const autoplay = !reduced && !userPaused && !hovered && !focused
  const many = banners.length > 1

  function goTo(index: number) {
    const el = track.current
    if (!el) return
    const next = (index + banners.length) % banners.length
    el.scrollTo({
      left: next * el.clientWidth,
      behavior: reduced ? "auto" : "smooth",
    })
  }

  // The active slide follows the scroll position, however it moved.
  function onScroll() {
    const el = track.current
    if (!el || el.clientWidth === 0) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }

  useEffect(() => {
    if (!autoplay || !many) return
    const id = setInterval(() => {
      if (document.hidden) return
      const el = track.current
      if (!el) return
      const index = Math.round(el.scrollLeft / el.clientWidth)
      el.scrollTo({
        left: ((index + 1) % banners.length) * el.clientWidth,
        behavior: "smooth",
      })
    }, AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [autoplay, many, banners.length])

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured offers"
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false)
      }}
    >
      <div
        ref={track}
        onScroll={onScroll}
        aria-live={autoplay ? "off" : "polite"}
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto rounded-lg [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((b, i) => {
          const src = safeImageSrc(b.imageUrl)
          return (
            <div
              key={b.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${banners.length}`}
              // Off-screen slides are not focusable and not read as available content.
              inert={i !== active}
              className="relative aspect-[3/1] min-h-40 w-full shrink-0 snap-center bg-neutral-200"
            >
              {src && (
                <ResponsiveImage
                  src={src}
                  alt=""
                  widths={[600, 900, 1200]}
                  sizes="100vw"
                  ratio={3}
                  // The first slide is the LCP candidate: fetch it first, defer the rest.
                  priority={i === 0}
                  className="absolute inset-0"
                />
              )}
              <div className="absolute inset-0 flex flex-col justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-4 text-white">
                <h2 className="text-xl font-semibold">
                  <Link
                    to={sitePath(b.linkUrl)}
                    className="after:absolute after:inset-0 focus-visible:underline"
                  >
                    {b.title}
                  </Link>
                </h2>
                {b.subtitle && <p className="text-sm">{b.subtitle}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {many && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Previous slide"
            onClick={() => goTo(active - 1)}
          >
            &lsaquo;
          </Button>
          <ul className="flex gap-1" aria-label="Choose a slide">
            {banners.map((b, i) => (
              <li key={b.id}>
                <button
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === active ? "true" : undefined}
                  onClick={() => goTo(i)}
                  // 24 px target (WCAG 2.2 target size); the dot itself stays small
                  className="flex size-6 items-center justify-center"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-3 rounded-full border border-neutral-800",
                      i === active ? "bg-neutral-800" : "bg-transparent"
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Next slide"
            onClick={() => goTo(active + 1)}
          >
            &rsaquo;
          </Button>
          {!reduced && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={userPaused}
              onClick={() => setUserPaused((p) => !p)}
            >
              {userPaused ? "Play" : "Pause"}
              <span className="sr-only"> automatic slide show</span>
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
