import { Suspense, useState } from "react"

import { lazyNamed } from "@/lib/lazyNamed"
import { safeImageSrc } from "@/lib/safeUrl"

const loadDialog = () => import("./PhotoDialog")
const PhotoDialog = lazyNamed(loadDialog, "PhotoDialog")

/** Thumbnails that open a larger view in a dialog (focus trap, Escape and the backdrop close it). */
export function PhotoLightbox({
  photos,
  label,
}: {
  photos: string[]
  label: string
}) {
  const [open, setOpen] = useState<string | null>(null)
  if (photos.length === 0) return null
  return (
    <>
      <ul className="flex flex-wrap gap-2" aria-label={`${label} photos`}>
        {photos.map((url, i) => (
          <li key={url}>
            <button
              type="button"
              onPointerEnter={() => void loadDialog()}
              onClick={() => setOpen(url)}
              aria-label={`Open photo ${i + 1} of ${photos.length}`}
            >
              <img
                src={safeImageSrc(url) ?? undefined}
                alt=""
                loading="lazy"
                className="size-16 rounded border object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
      {open !== null && (
        // Loaded on first click (the dialog + focus trap + animation are not needed to LOOK at thumbnails).
        <Suspense fallback={null}>
          <PhotoDialog url={open} label={label} onClose={() => setOpen(null)} />
        </Suspense>
      )}
    </>
  )
}
