import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { preload } from "react-dom"

import { ResponsiveImage } from "@/components/common/ResponsiveImage"
import { imageSources } from "@/lib/images"
import { cn } from "@/lib/utils"

const MAIN_WIDTHS = [400, 600, 800] as const
// Two columns from md up (half the viewport, capped by the page width), full width below.
const MAIN_SIZES = "(min-width: 1024px) 480px, (min-width: 768px) 46vw, 92vw"

type GalleryImage = { url: string; alt?: string }

export function Gallery({
  images,
  productName,
}: {
  images: readonly GalleryImage[]
  productName: string
}) {
  // The ONLY state is the index. The current image, the next image and the
  // "2 of 4" label are all derived from it during render.
  const [index, setIndex] = useState(0)
  // DOM refs: the scrolling strip and each thumbnail button (a mutable Map in a
  // ref: changing it must NOT re-render).
  const stripRef = useRef<HTMLUListElement>(null)
  const thumbRefs = useRef(new Map<number, HTMLButtonElement>())

  // Keep the selected thumbnail visible. Scrolls only the strip itself
  // (scrollIntoView could also scroll the whole page on first paint).
  useEffect(() => {
    const strip = stripRef.current
    const thumb = thumbRefs.current.get(index)
    if (!strip || !thumb) return
    const target =
      thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2
    strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" })
  }, [index])
  const count = images.length
  if (count === 0) return <div className="aspect-square bg-neutral-100" />

  const current = images[index]!
  const nextIndex = (index + 1) % count
  // React 19 resource hint, legal during render: the next image is ready on "next".
  if (count > 1) {
    // Must describe the SAME candidates the <img> will pick, or the browser downloads two files.
    const next = imageSources(images[nextIndex]!.url, MAIN_WIDTHS)
    preload(next.src, {
      as: "image",
      imageSrcSet: next.srcSet,
      imageSizes: next.srcSet ? MAIN_SIZES : undefined,
    })
  }

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count)

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") go(1)
    else if (event.key === "ArrowLeft") go(-1)
    else return
    event.preventDefault()
  }

  return (
    // ArrowLeft/ArrowRight move between images (APG carousel); the keys bubble up from the
    // focused thumbnail/buttons, the group itself is not a tab stop.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={`${productName} images`}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-2"
    >
      <div className="relative aspect-square overflow-hidden rounded bg-neutral-100">
        <ResponsiveImage
          src={current.url}
          alt={current.alt ?? `${productName}, image ${index + 1}`}
          widths={MAIN_WIDTHS}
          sizes={MAIN_SIZES}
          ratio={1}
          // The first image is the PDP's LCP element: eager + high priority. Later ones are user-triggered.
          priority={index === 0}
        />
        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-1 -translate-y-1/2 rounded-full bg-white/90 p-1 shadow"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => go(1)}
              className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full bg-white/90 p-1 shadow"
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </>
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        Image {index + 1} of {count}
      </p>
      <ul ref={stripRef} className="relative flex gap-2 overflow-x-auto">
        {images.map((image, i) => (
          <li key={image.url}>
            <button
              ref={(el) => {
                if (el) thumbRefs.current.set(i, el)
                return () => {
                  thumbRefs.current.delete(i)
                }
              }}
              type="button"
              aria-label={`Show image ${i + 1} of ${count}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded border-2",
                i === index ? "border-black" : "border-transparent"
              )}
            >
              <ResponsiveImage
                src={image.url}
                alt=""
                widths={[64, 128]}
                sizes="64px"
                ratio={1}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
