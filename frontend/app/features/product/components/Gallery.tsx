import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import { preload } from "react-dom"

import { cn } from "@/lib/utils"

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
  const count = images.length
  if (count === 0) return <div className="aspect-square bg-neutral-100" />

  const current = images[index]!
  const nextIndex = (index + 1) % count
  // React 19 resource hint, legal during render: the next image is ready on "next".
  if (count > 1) preload(images[nextIndex]!.url, { as: "image" })

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count)

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") go(1)
    else if (event.key === "ArrowLeft") go(-1)
    else return
    event.preventDefault()
  }

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={`${productName} images`}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-2"
    >
      <div className="relative aspect-square overflow-hidden rounded bg-neutral-100">
        <img
          src={current.url}
          alt={current.alt ?? `${productName}, image ${index + 1}`}
          width={800}
          height={800}
          className="size-full object-cover"
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
      <ul className="flex gap-2">
        {images.map((image, i) => (
          <li key={image.url}>
            <button
              type="button"
              aria-label={`Show image ${i + 1} of ${count}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "size-16 overflow-hidden rounded border-2",
                i === index ? "border-black" : "border-transparent"
              )}
            >
              <img
                src={image.url}
                alt=""
                width={64}
                height={64}
                loading="lazy"
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
