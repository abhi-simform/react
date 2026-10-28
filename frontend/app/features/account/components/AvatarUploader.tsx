import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { ImageDropzone, uploadImage } from "@/features/uploads"
import { isAbortError } from "@/lib/async"
import { toApiError } from "@/lib/api/errors"
import { safeImageSrc } from "@/lib/safeUrl"

type State =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "error"; message: string }

/**
 * Avatar (7.8): choose -> instant preview (object URL) -> Upload with a progress bar and a
 * Cancel button (aborts the XHR) -> the returned URL is saved on the profile. The upload
 * function has the plan's signature `uploadImage(file, { onProgress, signal })`.
 */
export function AvatarUploader({
  currentUrl,
  name,
  onUploaded,
}: {
  currentUrl: string | null
  name: string
  /** Receives the stored image URL; resolves when it has been saved on the profile. */
  onUploaded: (url: string) => Promise<void>
}) {
  const [files, setFiles] = useState<File[]>([])
  const [state, setState] = useState<State>({ status: "idle" })
  const controller = useRef<AbortController | null>(null)
  const file = files[0]
  const busy = state.status === "uploading"

  async function upload() {
    if (!file || busy) return
    const mine = new AbortController()
    controller.current = mine
    setState({ status: "uploading", progress: 0 })
    try {
      const stored = await uploadImage(file, {
        signal: mine.signal,
        onProgress: (progress) => setState({ status: "uploading", progress }),
      })
      await onUploaded(stored.url)
      setFiles([])
      setState({ status: "idle" })
    } catch (err) {
      if (isAbortError(err)) return setState({ status: "idle" }) // the user cancelled: not an error
      setState({ status: "error", message: toApiError(err).message })
    }
  }

  return (
    <section aria-label="Profile photo" className="flex flex-col gap-2">
      <h2 className="font-medium">Profile photo</h2>
      {safeImageSrc(currentUrl) ? (
        <img
          src={safeImageSrc(currentUrl) ?? undefined}
          alt={`${name}, current profile`}
          className="size-24 rounded-full border object-cover"
        />
      ) : (
        <div
          aria-label="No photo yet"
          role="img"
          className="flex size-24 items-center justify-center rounded-full border bg-muted text-2xl"
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <ImageDropzone
        label="Choose a new photo"
        value={files}
        onChange={(next) => {
          setState({ status: "idle" })
          setFiles(next)
        }}
        max={1}
        disabled={busy}
      />
      {file && (
        <div className="flex items-center gap-2">
          {busy ? (
            <>
              <progress
                value={state.progress}
                max={1}
                aria-label="Upload progress"
                className="w-40"
              />
              <span role="status" className="text-xs">
                {Math.round(state.progress * 100)}%
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => controller.current?.abort()}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" onClick={() => void upload()}>
              {state.status === "error" ? "Retry upload" : "Upload photo"}
            </Button>
          )}
        </div>
      )}
      {state.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </section>
  )
}
