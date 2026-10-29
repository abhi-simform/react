import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { NativeSelect } from "@/components/native-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiUpload } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { qk } from "@/lib/queryKeys"
import { createBanner, updateBanner } from "./api"
import { fromIstLocal, toIstLocal } from "./dates"
import type { Banner } from "./types"

const schema = z
  .object({
    title: z.string().trim().min(1, "Required").max(100),
    subtitle: z.string().trim().max(200).optional(),
    imageUrl: z.url("Upload an image or paste its URL"),
    // Links stay on the shop: "/deals" yes, "https://..." and "//evil.com" no (the API checks too).
    linkUrl: z
      .string()
      .regex(/^\/(?![/\\])[^\s]*$/, "Use a same-site path like /deals"),
    placement: z.enum(["hero", "strip"]),
    sortOrder: z.number({ error: "Enter a whole number" }).int(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (
      v.startsAt &&
      v.endsAt &&
      fromIstLocal(v.endsAt) <= fromIstLocal(v.startsAt)
    )
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "The end must be after the start",
      })
  })
type Values = z.infer<typeof schema>

const num = (v: unknown) => (v === "" ? Number.NaN : Number(v))

/** What the storefront shows for a banner, at a given viewport width (a rough mock, not pixel exact). */
export function BannerPreview({
  width,
  title,
  subtitle,
  imageUrl,
}: {
  width: number
  title: string
  subtitle?: string
  imageUrl?: string
}) {
  return (
    <div
      className="relative overflow-hidden rounded border bg-muted"
      style={{
        width,
        maxWidth: "100%",
        aspectRatio: width > 600 ? "3 / 1" : "4 / 3",
      }}
      role="img"
      aria-label={`Preview at ${width}px: ${title}`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      <div className="absolute inset-x-0 bottom-0 bg-black/55 p-3 text-white">
        <p
          className={
            width > 600 ? "text-lg font-semibold" : "text-sm font-semibold"
          }
        >
          {title || "Title"}
        </p>
        {subtitle ? <p className="text-xs">{subtitle}</p> : null}
      </div>
    </div>
  )
}

export function BannerDialog({
  banner,
  onClose,
}: {
  banner: Banner | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [view, setView] = useState<"desktop" | "mobile">("desktop")
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: banner
      ? {
          title: banner.title,
          subtitle: banner.subtitle ?? "",
          imageUrl: banner.imageUrl,
          linkUrl: banner.linkUrl,
          placement: banner.placement,
          sortOrder: banner.sortOrder,
          startsAt: banner.startsAt ? toIstLocal(banner.startsAt) : "",
          endsAt: banner.endsAt ? toIstLocal(banner.endsAt) : "",
          isActive: banner.isActive,
        }
      : {
          title: "",
          subtitle: "",
          imageUrl: "",
          linkUrl: "/deals",
          placement: "hero",
          sortOrder: 0,
          startsAt: "",
          endsAt: "",
          isActive: true,
        },
  })
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors },
  } = form
  const w = useWatch({ control })

  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = {
        title: v.title,
        subtitle: v.subtitle || undefined,
        imageUrl: v.imageUrl,
        linkUrl: v.linkUrl,
        placement: v.placement,
        sortOrder: v.sortOrder,
        startsAt: v.startsAt
          ? fromIstLocal(v.startsAt).toISOString()
          : undefined,
        endsAt: v.endsAt ? fromIstLocal(v.endsAt).toISOString() : undefined,
        isActive: v.isActive,
      }
      return banner ? updateBanner(banner._id, body) : createBanner(body)
    },
    onSuccess: async () => {
      toast.success(banner ? "Banner saved" : "Banner created")
      await queryClient.invalidateQueries({ queryKey: qk.marketing.banners() })
      onClose()
    },
    onError: (e) => {
      if (isApiError(e) && Object.keys(e.fieldErrors).length)
        for (const [p, m] of Object.entries(e.fieldErrors))
          setError(p as keyof Values, { type: "server", message: m })
      else toast.error(e.message)
    },
  })

  async function upload(file: File) {
    setUploadError(null)
    setProgress(0)
    const fd = new FormData()
    fd.append("file", file)
    try {
      const stored = await apiUpload<{ url: string }>("/uploads/images", fd, {
        onProgress: setProgress,
      })
      setValue("imageUrl", stored.url, { shouldValidate: true })
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setProgress(null)
    }
  }

  const Err = ({ k }: { k: keyof Values }) =>
    errors[k] ? (
      <p role="alert" className="text-sm text-destructive">
        {errors[k].message}
      </p>
    ) : null

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{banner ? "Edit banner" : "New banner"}</DialogTitle>
          <DialogDescription>
            Shown on the storefront home page between its start and end (India
            time).
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={handleSubmit((v) => save.mutate(v))}
        >
          <Label htmlFor="b-title">Title</Label>
          <Input
            id="b-title"
            {...register("title")}
            aria-invalid={!!errors.title}
          />
          <Err k="title" />
          <Label htmlFor="b-sub">Subtitle</Label>
          <Input id="b-sub" {...register("subtitle")} />
          <Label htmlFor="b-file">Image</Label>
          <input
            id="b-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void upload(f)
            }}
          />
          {progress !== null ? (
            <progress value={progress} max={1} aria-label="Upload progress" />
          ) : null}
          {uploadError ? (
            <p role="alert" className="text-sm text-destructive">
              {uploadError}
            </p>
          ) : null}
          <Label htmlFor="b-url">Image URL</Label>
          <Input
            id="b-url"
            {...register("imageUrl")}
            aria-invalid={!!errors.imageUrl}
          />
          <Err k="imageUrl" />
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="b-link">Link (same-site path)</Label>
              <Input
                id="b-link"
                {...register("linkUrl")}
                aria-invalid={!!errors.linkUrl}
              />
              <Err k="linkUrl" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="b-place">Placement</Label>
              <NativeSelect id="b-place" {...register("placement")}>
                <option value="hero">Hero</option>
                <option value="strip">Strip</option>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="b-order">Sort order</Label>
              <Input
                id="b-order"
                inputMode="numeric"
                {...register("sortOrder", { setValueAs: num })}
              />
              <Err k="sortOrder" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="b-start">Starts (IST)</Label>
              <Input
                id="b-start"
                type="datetime-local"
                {...register("startsAt")}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="b-end">Ends (IST)</Label>
              <Input id="b-end" type="datetime-local" {...register("endsAt")} />
              <Err k="endsAt" />
            </div>
          </div>
          <Label className="gap-2">
            <Checkbox
              checked={!!w.isActive}
              onCheckedChange={(v) => setValue("isActive", !!v)}
            />
            Active (switched on)
          </Label>
          <section aria-label="Preview" className="flex flex-col gap-2">
            <div className="flex gap-2" role="group" aria-label="Preview width">
              <Button
                type="button"
                size="sm"
                variant={view === "desktop" ? "default" : "outline"}
                aria-pressed={view === "desktop"}
                onClick={() => setView("desktop")}
              >
                Desktop (1200px)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === "mobile" ? "default" : "outline"}
                aria-pressed={view === "mobile"}
                onClick={() => setView("mobile")}
              >
                Mobile (375px)
              </Button>
            </div>
            <div className="overflow-x-auto">
              <BannerPreview
                width={view === "desktop" ? 640 : 280}
                title={w.title ?? ""}
                subtitle={w.subtitle}
                imageUrl={w.imageUrl}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Scaled preview of the {view} layout.
            </p>
          </section>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save banner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
