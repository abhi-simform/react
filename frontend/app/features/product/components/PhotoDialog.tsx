import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { safeImageSrc } from "@/lib/safeUrl"

/** The enlarged photo (focus trap, Escape and the backdrop close it). Loaded on demand by `PhotoLightbox`. */
export function PhotoDialog({
  url,
  label,
  onClose,
}: {
  url: string
  label: string
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogTitle className="sr-only">{label} photo</DialogTitle>
        <img
          src={safeImageSrc(url) ?? undefined}
          alt={label}
          className="max-h-[70vh] w-full object-contain"
        />
      </DialogContent>
    </Dialog>
  )
}
