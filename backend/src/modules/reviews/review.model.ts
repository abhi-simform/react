import {
  Schema,
  model,
  Types,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose"

export const REVIEW_STATUSES = ["published", "hidden"] as const

const reviewSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: "Product", required: true },
    user: { type: Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true }, // snapshot, already masked ("Casey C.")
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 2000 }, // PLAIN TEXT: never rendered as HTML
    photos: { type: [String], default: [] }, // urls returned by POST /uploads/images
    verifiedPurchase: { type: Boolean, default: false }, // computed on the server, never client-supplied
    helpfulCount: { type: Number, default: 0, min: 0 },
    reports: { type: [Types.ObjectId], default: [] }, // who reported it (one report per user)
    reportCount: { type: Number, default: 0 },
    status: { type: String, enum: REVIEW_STATUSES, default: "published" },
    moderationNote: String,
    editedAt: Date,
  },
  { timestamps: true }
)
// One review per user per product: enforced by the database, not just the service.
reviewSchema.index({ product: 1, user: 1 }, { unique: true })
reviewSchema.index({ product: 1, status: 1, helpfulCount: -1, createdAt: -1, _id: -1 })
reviewSchema.index({ product: 1, status: 1, createdAt: -1, _id: -1 })
reviewSchema.index({ product: 1, status: 1, rating: -1, helpfulCount: -1, _id: -1 })
reviewSchema.index({ status: 1, reportCount: -1, createdAt: -1 })

export type ReviewDoc = HydratedDocument<InferSchemaType<typeof reviewSchema>>
export const Review = model("Review", reviewSchema)

/** One vote per (kind, target, user): helpful on reviews, upvotes on questions and answers. */
const voteSchema = new Schema({
  kind: { type: String, enum: ["review", "question", "answer"], required: true },
  target: { type: Types.ObjectId, required: true },
  user: { type: Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: () => new Date() },
})
voteSchema.index({ kind: 1, target: 1, user: 1 }, { unique: true })
voteSchema.index({ user: 1, kind: 1, target: 1 })
export const Vote = model("Vote", voteSchema)

/** "Casey Customer" -> "Casey C." : reviews are public, full names are not. */
export function maskName(name: string) {
  const [first = "Customer", ...rest] = name.trim().split(/\s+/)
  const last = rest[rest.length - 1]
  return last ? `${first} ${last[0]!.toUpperCase()}.` : first
}

type ReviewLike = InferSchemaType<typeof reviewSchema> & {
  _id: unknown
  createdAt: Date
  updatedAt: Date
}
export function toPublicReview(
  r: ReviewDoc | ReviewLike,
  viewerId?: string,
  votedIds?: Set<string>
) {
  const id = String(r._id)
  return {
    id,
    productId: String(r.product),
    author: r.userName,
    rating: r.rating,
    title: r.title ?? null,
    body: r.body,
    photos: r.photos,
    verifiedPurchase: r.verifiedPurchase,
    helpfulCount: r.helpfulCount,
    status: r.status,
    edited: Boolean(r.editedAt),
    isMine: viewerId ? String(r.user) === viewerId : false,
    myVote: votedIds?.has(id) ?? false,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}
