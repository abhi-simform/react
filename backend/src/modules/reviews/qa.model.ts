import { Schema, model, Types, type InferSchemaType } from "mongoose"

const questionSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: "Product", required: true },
    user: { type: Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true, trim: true, maxlength: 300 },
    status: { type: String, enum: ["published", "hidden"], default: "published" },
    answerCount: { type: Number, default: 0 },
    upvotes: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
)
questionSchema.index({ product: 1, status: 1, upvotes: -1, createdAt: -1, _id: -1 })
questionSchema.index({ product: 1, status: 1, createdAt: -1, _id: -1 })
questionSchema.index({ status: 1, createdAt: -1 })
export const Question = model("Question", questionSchema)

const answerSchema = new Schema(
  {
    question: { type: Types.ObjectId, ref: "Question", required: true },
    product: { type: Types.ObjectId, ref: "Product", required: true },
    user: { type: Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    // "seller" = the product's own seller, "staff" = ShopSphere admin, null = another shopper.
    badge: { type: String, enum: ["seller", "staff"] },
    verifiedBuyer: { type: Boolean, default: false },
    status: { type: String, enum: ["published", "hidden"], default: "published" },
    upvotes: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
)
answerSchema.index({ question: 1, status: 1, upvotes: -1, createdAt: 1 })
answerSchema.index({ status: 1, createdAt: -1 })
export const Answer = model("Answer", answerSchema)

type Q = InferSchemaType<typeof questionSchema> & { _id: unknown; createdAt: Date }
type A = InferSchemaType<typeof answerSchema> & { _id: unknown; createdAt: Date }

export const toPublicAnswer = (a: A, viewerId?: string, voted?: Set<string>) => ({
  id: String(a._id),
  questionId: String(a.question),
  author: a.userName,
  text: a.text,
  badge: a.badge ?? null,
  verifiedBuyer: a.verifiedBuyer,
  upvotes: a.upvotes,
  status: a.status,
  isMine: viewerId ? String(a.user) === viewerId : false,
  myVote: voted?.has(String(a._id)) ?? false,
  createdAt: a.createdAt,
})

export const toPublicQuestion = (
  q: Q,
  answers: ReturnType<typeof toPublicAnswer>[],
  viewerId?: string,
  voted?: Set<string>
) => ({
  id: String(q._id),
  productId: String(q.product),
  author: q.userName,
  text: q.text,
  upvotes: q.upvotes,
  answerCount: q.answerCount,
  status: q.status,
  isMine: viewerId ? String(q.user) === viewerId : false,
  myVote: voted?.has(String(q._id)) ?? false,
  answers,
  createdAt: q.createdAt,
})
