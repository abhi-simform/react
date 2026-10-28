import { useCallback, useMemo, useRef, useState } from "react"

import { toApiError } from "@/lib/api/errors"

import { uploadImage } from "../api"

export type UploadItem = {
  file: File
  status: "queued" | "uploading" | "done" | "error"
  /** 0..1 */
  progress: number
  url?: string
  error?: string
}

/**
 * Per-file upload state for forms that attach photos (reviews, returns). The dropzone only picks
 * `File`s; this hook uploads them ONE AT A TIME to `POST /uploads/images` (the endpoint takes a
 * single file by design), keeps progress and an error per file, and never re-uploads a file that
 * already succeeded: after a partial failure the shopper presses submit again and only the failed
 * files go up. Resolves with every URL or `null` when something still failed.
 */
export function useUploadQueue() {
  const [items, setItems] = useState<UploadItem[]>([])
  // The newest items for the async loop (state in a closure would be stale after the first await).
  const latest = useRef<UploadItem[]>([])
  const commit = useCallback((next: UploadItem[]) => {
    latest.current = next
    setItems(next)
  }, [])

  const patch = useCallback(
    (file: File, change: Partial<UploadItem>) =>
      commit(
        latest.current.map((i) => (i.file === file ? { ...i, ...change } : i))
      ),
    [commit]
  )

  /** Controlled by the dropzone: keep state for files that stay, add queued entries for new ones. */
  const setFiles = useCallback(
    (files: File[]) =>
      commit(
        files.map(
          (file) =>
            latest.current.find((i) => i.file === file) ?? {
              file,
              status: "queued" as const,
              progress: 0,
            }
        )
      ),
    [commit]
  )

  const uploadAll = useCallback(async (): Promise<string[] | null> => {
    for (const item of latest.current) {
      if (item.status === "done") continue
      patch(item.file, { status: "uploading", progress: 0, error: undefined })
      try {
        const stored = await uploadImage(item.file, {
          onProgress: (p) => patch(item.file, { progress: p }),
        })
        patch(item.file, { status: "done", progress: 1, url: stored.url })
      } catch (err) {
        const e = toApiError(err)
        patch(item.file, {
          status: "error",
          error:
            e.code === "FILE_TOO_LARGE" || e.code === "UNSUPPORTED_FILE_TYPE"
              ? e.message.replace(/^HTTP \d+: /, "")
              : "Upload failed. Try again.",
        })
      }
    }
    const all = latest.current
    return all.every((i) => i.status === "done")
      ? all.map((i) => i.url as string)
      : null
  }, [patch])

  const files = useMemo(() => items.map((i) => i.file), [items])
  const reset = useCallback(() => commit([]), [commit])
  return { items, files, setFiles, uploadAll, reset }
}
