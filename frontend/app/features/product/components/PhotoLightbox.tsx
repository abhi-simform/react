import { useState } from "react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { safeImageSrc } from "@/lib/safeUrl"

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
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogTitle className="sr-only">{label} photo</DialogTitle>
          {open && (
            <img
              src={safeImageSrc(open) ?? undefined}
              alt={`${label} photo`}
              className="max-h-[70vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
