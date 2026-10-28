import { ImagePlus, X } from "lucide-react"
import { useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useLiveObjectUrlCount, useObjectUrl } from "../objectUrls"
import {
  ACCEPTED_IMAGE_TYPES,
  imageFileProblem,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
} from "@/lib/imageFiles"

type Props = {
  /** Controlled: the files currently chosen. */
  value: readonly File[]
  onChange: (files: File[]) => void
  label: string
  /** 1 = a single-image picker (a new pick REPLACES the old one). */
  max?: number
  disabled?: boolean
  /** Error from the surrounding form/schema (shown with the local "why not added" list). */
  error?: string
}

const sameFile = (a: File, b: File) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified

/**
 * Image picker (7.8): click, drag and drop, or paste; JPEG/PNG/WebP up to 2 MB, at most `max`.
 * Invalid files are NOT added and each gets a specific message. Previews are object URLs
 * (instant, no upload needed), revoked when a thumbnail goes away.
 */
export function ImageDropzone({
  value,
  onChange,
  label,
  max = MAX_IMAGES,
  disabled,
  error,
}: Props) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [problems, setProblems] = useState<string[]>([])

  function add(incoming: File[]) {
    const accepted: File[] = []
    const rejected: string[] = []
    for (const file of incoming) {
      const problem = imageFileProblem(file)
      if (problem) rejected.push(problem)
      else if ([...value, ...accepted].some((f) => sameFile(f, file)))
        rejected.push(`${file.name} is already added`)
      else accepted.push(file)
    }
    let next = max === 1 ? accepted.slice(-1) : [...value, ...accepted]
    if (next.length > max) {
      rejected.push(
        `Only ${max} image${max > 1 ? "s" : ""} allowed: ${next.length - max} not added`
      )
      next = next.slice(0, max)
    }
    setProblems(rejected)
    if (accepted.length > 0) onChange(next)
  }

  const remove = (file: File) => {
    setProblems([])
    onChange(value.filter((f) => f !== file))
  }

  const hint = `JPEG, PNG or WebP, up to ${MAX_IMAGE_BYTES / 1024 / 1024} MB each${max > 1 ? `, up to ${max} images` : ""}.`
  const shownProblems = error ? [...problems, error] : problems

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span id={`${id}-label`} className="font-medium">
        {label}
      </span>
      {/* Focusable so Ctrl/Cmd+V works after clicking or tabbing here. */}
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint${shownProblems.length ? ` ${id}-problems` : ""}`}
        tabIndex={disabled ? -1 : 0}
        onPaste={(e) => {
          const files = [...e.clipboardData.files].filter((f) =>
            f.type.startsWith("image/")
          )
          if (files.length > 0 && !disabled) {
            e.preventDefault()
            add(files)
          }
        }}
        onDragOver={(e) => {
          e.preventDefault() // required, or the browser will not allow a drop
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) add([...e.dataTransfer.files])
        }}
        className={cn(
          "flex flex-col items-start gap-2 rounded border border-dashed p-3",
          dragging && "border-solid bg-muted"
        )}
      >
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          Drop images here, paste one, or choose files. {hint}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          multiple={max > 1}
          hidden
          onChange={(e) => {
            add([...(e.target.files ?? [])])
            e.target.value = "" // let the same file be chosen again later
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus aria-hidden className="size-4" />
          {max === 1 ? "Choose image" : "Choose images"}
        </Button>
        {value.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Chosen images">
            {value.map((file) => (
              <Thumb
                key={`${file.name}-${file.size}-${file.lastModified}`}
                file={file}
                disabled={disabled}
                onRemove={() => remove(file)}
              />
            ))}
          </ul>
        )}
      </div>
      {shownProblems.length > 0 && (
        <ul
          id={`${id}-problems`}
          role="alert"
          className="text-xs text-destructive"
        >
          {shownProblems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {import.meta.env.DEV && <LiveUrlCounter />}
    </div>
  )
}

function Thumb({
  file,
  onRemove,
  disabled,
}: {
  file: File
  onRemove: () => void
  disabled?: boolean
}) {
  const url = useObjectUrl(file)
  return (
    <li className="relative">
      {url ? (
        <img
          src={url}
          alt={file.name}
          className="size-20 rounded border object-cover"
        />
      ) : (
        <div aria-hidden className="size-20 rounded border bg-muted" />
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="absolute -end-2 -top-2 rounded-full border bg-background p-0.5"
      >
        <X aria-hidden className="size-3" />
      </button>
    </li>
  )
}

/** Dev evidence for the acceptance criterion: previews alive = object URLs not yet revoked. */
function LiveUrlCounter() {
  const count = useLiveObjectUrlCount()
  return (
    <p data-testid="object-url-count" className="text-xs text-muted-foreground">
      dev: object URLs alive: {count}
    </p>
  )
}
