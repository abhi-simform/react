import { zodResolver } from "@hookform/resolvers/zod"
import { useId, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormField } from "@/components/form/FormField"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ImageDropzone,
  UploadStatusList,
  useUploadQueue,
} from "@/features/uploads"
import { toApiError } from "@/lib/api/errors"
import { serverMessage } from "@/lib/forms/applyApiError"
import { safeImageSrc } from "@/lib/safeUrl"

import { useSaveReview } from "../hooks/useReviews"
import {
  reviewFormSchema,
  type Review,
  type ReviewFormInput,
  type ReviewFormOutput,
} from "../reviews.schemas"

const STAR_LABELS = ["Terrible", "Poor", "Okay", "Good", "Excellent"]
const MAX_PHOTOS = 5

/**
 * Write or edit a review (11.6). RHF + Zod (`reviewFormSchema`); photos are picked as Files
 * (previews, type and size checked), uploaded ONE BY ONE after the form is valid with progress and
 * an error per file, and a retry only re-sends the failed ones. When editing, the review's
 * existing photos are kept (removable) and count towards the limit of 5. The submit button is
 * disabled while the request runs, and the server also rejects a second review (409).
 */
export function ReviewDialog({
  productId,
  slug,
  existing,
  open,
  onOpenChange,
}: {
  productId: string
  slug: string
  existing?: Review
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Edit your review" : "Write a review"}
          </DialogTitle>
          <DialogDescription>
            Reviews are public and show your first name and last initial.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ReviewForm
            productId={productId}
            slug={slug}
            existing={existing}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ReviewForm({
  productId,
  slug,
  existing,
  onDone,
}: {
  productId: string
  slug: string
  existing?: Review
  onDone: () => void
}) {
  const id = useId()
  const uploads = useUploadQueue()
  const [kept, setKept] = useState<string[]>(existing?.photos ?? [])
  const save = useSaveReview(productId, slug, existing?.id)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ReviewFormInput, unknown, ReviewFormOutput>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: existing ? String(existing.rating) : "",
      title: existing?.title ?? "",
      body: existing?.body ?? "",
    },
  })

  async function submit(v: ReviewFormOutput) {
    const urls = await uploads.uploadAll()
    if (urls === null) {
      setError("root", {
        message:
          "Some photos did not upload. Press Submit again to retry only those.",
      })
      return
    }
    try {
      await save.mutateAsync({
        rating: v.rating,
        title: v.title,
        body: v.body,
        photos: [...kept, ...urls],
      })
      toast.success(existing ? "Review updated" : "Thanks for your review")
      onDone()
    } catch (err) {
      const e = toApiError(err)
      if (e.isValidation) {
        const fe = e.fieldErrors
        for (const f of ["rating", "title", "body"] as const)
          if (fe[f]) setError(f, { type: "server", message: fe[f] })
        const photo = Object.entries(fe).find(([p]) => p.startsWith("photos"))
        if (photo) setError("root", { message: photo[1] })
        return
      }
      setError("root", {
        message:
          e.code === "ALREADY_REVIEWED" || e.code === "OWN_PRODUCT"
            ? serverMessage(e)
            : "We could not save your review. Please try again.",
      })
    }
  }

  const busy =
    save.isPending || uploads.items.some((i) => i.status === "uploading")
  return (
    <form
      onSubmit={handleSubmit(submit)}
      noValidate
      className="flex flex-col gap-3 text-sm"
    >
      <fieldset
        aria-describedby={errors.rating ? `${id}-rating-error` : undefined}
      >
        <legend className="font-medium">Your rating</legend>
        <div className="flex gap-2">
          {STAR_LABELS.map((label, i) => (
            <span key={label}>
              <input
                id={`${id}-star-${i + 1}`}
                type="radio"
                value={i + 1}
                {...register("rating")}
                className="peer sr-only"
              />
              <label
                htmlFor={`${id}-star-${i + 1}`}
                title={label}
                className="cursor-pointer text-2xl text-neutral-400 peer-checked:text-amber-600 peer-focus-visible:ring-2"
              >
                <span className="sr-only">
                  {i + 1} star{i ? "s" : ""}: {label}
                </span>
                <span aria-hidden>★</span>
              </label>
            </span>
          ))}
        </div>
        {errors.rating && (
          <p
            id={`${id}-rating-error`}
            role="alert"
            className="text-xs text-red-700"
          >
            {errors.rating.message}
          </p>
        )}
      </fieldset>
      <FormField label="Title (optional)" error={errors.title?.message}>
        {(c) => (
          <input className="rounded border p-1" {...c} {...register("title")} />
        )}
      </FormField>
      <FormField label="Your review" error={errors.body?.message}>
        {(c) => (
          <textarea
            rows={4}
            className="rounded border p-2"
            {...c}
            {...register("body")}
          />
        )}
      </FormField>

      {kept.length > 0 && (
        <ul
          className="flex flex-wrap gap-2"
          aria-label="Photos already on your review"
        >
          {kept.map((u) => (
            <li key={u} className="relative">
              <img
                src={safeImageSrc(u) ?? undefined}
                alt=""
                className="size-16 rounded border object-cover"
              />
              <button
                type="button"
                aria-label="Remove this photo"
                className="absolute -top-2 -right-2 rounded-full border bg-white px-1 text-xs"
                onClick={() => setKept((k) => k.filter((x) => x !== u))}
              >
                x
              </button>
            </li>
          ))}
        </ul>
      )}
      <ImageDropzone
        label="Photos (optional)"
        max={MAX_PHOTOS - kept.length}
        value={uploads.files}
        onChange={uploads.setFiles}
        disabled={busy || kept.length >= MAX_PHOTOS}
      />
      <UploadStatusList items={uploads.items} />

      {errors.root?.message && (
        <p role="alert" className="text-xs text-red-700">
          {errors.root.message}
        </p>
      )}
      <Button type="submit" className="self-start" disabled={busy}>
        {busy ? "Submitting..." : existing ? "Save changes" : "Submit review"}
      </Button>
    </form>
  )
}
