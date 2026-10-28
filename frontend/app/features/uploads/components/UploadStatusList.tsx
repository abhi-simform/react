import type { UploadItem } from "../hooks/useUploadQueue"

/** Progress or failure per file, under the dropzone while a form uploads its photos. */
export function UploadStatusList({ items }: { items: readonly UploadItem[] }) {
  const relevant = items.filter((i) => i.status !== "queued")
  if (relevant.length === 0) return null
  return (
    <ul aria-label="Upload progress" className="text-xs" aria-live="polite">
      {relevant.map((i) => (
        <li
          key={`${i.file.name}-${i.file.size}-${i.file.lastModified}`}
          className={i.status === "error" ? "text-destructive" : undefined}
        >
          {i.file.name}:{" "}
          {i.status === "uploading"
            ? `uploading ${Math.round(i.progress * 100)}%`
            : i.status === "done"
              ? "uploaded"
              : (i.error ?? "failed")}
        </li>
      ))}
    </ul>
  )
}
