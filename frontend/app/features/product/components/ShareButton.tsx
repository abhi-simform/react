import { toast } from "sonner"

import { Button } from "@/components/ui/button"

/**
 * Share (Web Share API where it exists, mostly phones) or copy the link. The share sheet being
 * dismissed is an AbortError, not a failure; a clipboard that is blocked gets a sentence, not a
 * silent no-op.
 */
export function ShareButton({ title }: { title: string }) {
  async function share() {
    const url = window.location.href
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        // any other failure: fall through to copying the link
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied", { id: "link-copied" })
    } catch {
      toast.error("Could not copy the link. Copy it from the address bar.")
    }
  }
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => void share()}
    >
      Share
    </Button>
  )
}
