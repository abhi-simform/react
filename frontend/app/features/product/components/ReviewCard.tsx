import { ThumbsUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatDate, formatRelative } from "@/lib/format"

import type { Review } from "../reviews.schemas"
import { PhotoLightbox } from "./PhotoLightbox"

/**
 * One review. `body` and `title` are USER TEXT: they are rendered as React text children (escaped),
 * never with `dangerouslySetInnerHTML`, so `<img onerror=...>` in a review is shown literally
 * (Stage 10.9 probe, re-checked against the real API in the notes of 11.6).
 */
export function ReviewCard({
  review: r,
  onHelpful,
  helpfulBusy,
  onEdit,
  onDelete,
}: {
  review: Review
  onHelpful: (review: Review) => void
  helpfulBusy: boolean
  onEdit: (review: Review) => void
  onDelete: (review: Review) => void
}) {
  return (
    <li className="border-b pb-3">
      <p className="font-medium">
        <span aria-hidden className="text-warning">
          {"★".repeat(r.rating)}
          {"☆".repeat(5 - r.rating)}
        </span>
        <span className="sr-only">{r.rating} out of 5 stars.</span> {r.title}
      </p>
      <p className="whitespace-pre-line">{r.body}</p>
      <PhotoLightbox photos={r.photos} label={`${r.author}'s review`} />
      <p className="mt-1 text-xs text-muted-foreground">
        {r.author}
        {r.verifiedPurchase && (
          <span className="ms-1 rounded bg-emerald-100 px-1 py-0.5 text-emerald-900">
            Verified purchase
          </span>
        )}{" "}
        <time dateTime={r.createdAt} title={formatDate(r.createdAt)}>
          {formatRelative(r.createdAt)}
        </time>
        {r.edited ? " (edited)" : ""}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {r.isMine ? (
          <>
            <span className="text-xs text-muted-foreground">
              {r.helpfulCount} found this helpful
            </span>
            <Button variant="outline" size="xs" onClick={() => onEdit(r)}>
              Edit
            </Button>
            <Button variant="outline" size="xs" onClick={() => onDelete(r)}>
              Delete
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="xs"
            aria-pressed={r.myVote}
            disabled={helpfulBusy}
            onClick={() => onHelpful(r)}
          >
            <ThumbsUp
              aria-hidden
              className={r.myVote ? "fill-current" : undefined}
            />
            Helpful ({r.helpfulCount})
          </Button>
        )}
      </div>
    </li>
  )
}
