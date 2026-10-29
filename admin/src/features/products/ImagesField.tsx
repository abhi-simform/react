import { useRef, useState } from "react"
import { useFieldArray, useFormContext } from "react-hook-form"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiUpload } from "@/lib/api/client"
import type { ProductFormValues } from "./schema"

type Pending = {
  id: string
  file: File
  preview: string
  progress: number
  error?: string
  controller: AbortController
}

let seq = 0

/**
 * Image uploader: each file uploads on its own (own progress bar, own failure + Retry), so one bad
 * file never loses the others. A finished upload becomes a form row; rows are drag-sortable
 * (dnd-kit, keyboard too: focus the handle, Space, arrows, Space) and the first one is the
 * product's main image. Uploads go to POST /uploads/images (multipart, JPEG/PNG/WebP, 2 MB).
 */
export function ImagesField() {
  const { control, register, formState } = useFormContext<ProductFormValues>()
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "images",
  })
  const [pending, setPending] = useState<Pending[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const patch = (id: string, p: Partial<Pending>) =>
    setPending((list) => list.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const drop = (id: string) =>
    setPending((list) => {
      const hit = list.find((x) => x.id === id)
      if (hit) URL.revokeObjectURL(hit.preview)
      return list.filter((x) => x.id !== id)
    })

  async function upload(item: Pending) {
    const form = new FormData()
    form.append("file", item.file) // the browser writes the multipart boundary: no Content-Type here
    patch(item.id, { error: undefined, progress: 0 })
    try {
      const stored = await apiUpload<{ url: string }>("/uploads/images", form, {
        signal: item.controller.signal,
        onProgress: (progress) => patch(item.id, { progress }),
      })
      append({ url: stored.url, alt: "" }, { shouldFocus: false })
      drop(item.id)
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return drop(item.id)
      patch(item.id, {
        error: err instanceof Error ? err.message : "Upload failed",
      })
    }
  }

  function onFiles(files: FileList | null) {
    if (!files) return
    const room = 10 - fields.length - pending.length
    const items = [...files]
      .slice(0, Math.max(0, room))
      .map<Pending>((file) => ({
        id: String(++seq),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        controller: new AbortController(),
      }))
    setPending((list) => [...list, ...items])
    items.forEach((i) => void upload(i))
    if (inputRef.current) inputRef.current.value = ""
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = fields.findIndex((f) => f.id === active.id)
    const to = fields.findIndex((f) => f.id === over.id)
    if (from >= 0 && to >= 0) move(from, to)
  }

  const imagesError =
    formState.errors.images?.message ?? formState.errors.images?.root?.message

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          Add images
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          aria-label="Upload images"
          onChange={(e) => onFiles(e.target.files)}
        />
        <span className="text-sm text-muted-foreground">
          {fields.length}/10, JPEG/PNG/WebP up to 2 MB. Drag to reorder: the
          first is the main image.
        </span>
      </div>
      {imagesError ? (
        <p role="alert" className="text-sm text-destructive">
          {imagesError}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2" aria-label="Uploading">
        {pending.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded border p-2 text-sm"
          >
            <img
              src={p.preview}
              alt=""
              className="size-12 rounded object-cover"
            />
            <div className="flex-1">
              <p>{p.file.name}</p>
              {p.error ? (
                <p role="alert" className="text-destructive">
                  {p.error}
                </p>
              ) : (
                <progress
                  className="w-full"
                  max={1}
                  value={p.progress}
                  aria-label={`Uploading ${p.file.name}`}
                />
              )}
            </div>
            {p.error ? (
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => void upload(p)}
              >
                Retry
              </Button>
            ) : null}
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => {
                p.controller.abort()
                drop(p.id)
              }}
            >
              {p.error ? "Dismiss" : "Cancel"}
            </Button>
          </li>
        ))}
      </ul>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={fields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-2" aria-label="Product images">
            {fields.map((f, i) => (
              <SortableImage
                key={f.id}
                id={f.id}
                url={f.url}
                index={i}
                onRemove={() => remove(i)}
              >
                <Input
                  aria-label={`Alt text for image ${i + 1}`}
                  placeholder="Alt text"
                  {...register(`images.${i}.alt`)}
                />
              </SortableImage>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function SortableImage({
  id,
  url,
  index,
  onRemove,
  children,
}: {
  id: string
  url: string
  index: number
  onRemove: () => void
  children: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded border bg-background p-2 ${isDragging ? "opacity-70" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none p-1"
        aria-label={`Reorder image ${index + 1}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <img src={url} alt="" className="size-12 rounded object-cover" />
      <div className="flex-1">{children}</div>
      {index === 0 ? (
        <span className="text-xs text-muted-foreground">Main</span>
      ) : null}
      <Button type="button" size="xs" variant="outline" onClick={onRemove}>
        Remove
      </Button>
    </li>
  )
}
