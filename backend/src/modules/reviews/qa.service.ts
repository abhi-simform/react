import { Types, type Model } from "mongoose"
import { ApiError } from "../../utils/ApiError.js"
import { Product } from "../products/product.model.js"
import { User } from "../users/user.model.js"
import { hasPurchased } from "./review.service.js"
import { Answer, Question, toPublicAnswer, toPublicQuestion } from "./qa.model.js"
import { Vote, maskName } from "./review.model.js"

const oid = (id: string) => new Types.ObjectId(id)
const PREVIEW_ANSWERS = 3

async function votedSet(
  kind: "question" | "answer",
  ids: Types.ObjectId[],
  viewerId?: string
) {
  if (!viewerId || ids.length === 0) return undefined
  const votes = await Vote.find({ kind, user: viewerId, target: { $in: ids } })
    .select("target")
    .lean()
  return new Set(votes.map((v) => String(v.target)))
}

/** Seller/staff answers first, then the most upvoted, then oldest. */
const ANSWER_ORDER = { badgeRank: 1, upvotes: -1, createdAt: 1 } as const

async function topAnswers(questionId: unknown, limit: number, skip = 0) {
  return Answer.aggregate([
    { $match: { question: questionId, status: "published" } },
    { $addFields: { badgeRank: { $cond: [{ $ifNull: ["$badge", false] }, 0, 1] } } },
    { $sort: ANSWER_ORDER },
    { $skip: skip },
    { $limit: limit },
  ])
}

export async function listQuestions(
  productId: string,
  q: { page: number; limit: number; sort: "helpful" | "newest" },
  viewerId?: string
) {
  if (!(await Product.exists({ _id: productId, status: "active" })))
    throw ApiError.notFound("Product not found")
  const filter = { product: oid(productId), status: "published" as const }
  const [items, total] = await Promise.all([
    Question.find(filter)
      .sort(
        q.sort === "helpful"
          ? { upvotes: -1, createdAt: -1, _id: -1 }
          : { createdAt: -1, _id: -1 }
      )
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Question.countDocuments(filter),
  ])
  const answers = await Promise.all(items.map((i) => topAnswers(i._id, PREVIEW_ANSWERS)))
  const qVoted = await votedSet(
    "question",
    items.map((i) => i._id as Types.ObjectId),
    viewerId
  )
  const aVoted = await votedSet(
    "answer",
    answers.flat().map((a) => a._id as Types.ObjectId),
    viewerId
  )
  return {
    total,
    items: items.map((it, i) =>
      toPublicQuestion(
        it,
        answers[i]!.map((a) => toPublicAnswer(a, viewerId, aVoted)),
        viewerId,
        qVoted
      )
    ),
  }
}

export async function listAnswers(
  questionId: string,
  q: { page: number; limit: number },
  viewerId?: string
) {
  const question = await Question.findOne({ _id: questionId, status: "published" }).lean()
  if (!question) throw ApiError.notFound("Question not found")
  const total = await Answer.countDocuments({
    question: question._id,
    status: "published",
  })
  const rows = await topAnswers(question._id, q.limit, (q.page - 1) * q.limit)
  const voted = await votedSet(
    "answer",
    rows.map((r) => r._id as Types.ObjectId),
    viewerId
  )
  return { total, items: rows.map((a) => toPublicAnswer(a, viewerId, voted)) }
}

export async function ask(userId: string, productId: string, text: string) {
  if (!(await Product.exists({ _id: productId, status: "active" })))
    throw ApiError.notFound("Product not found")
  const user = await User.findById(userId).select("name").lean()
  if (!user) throw ApiError.unauthorized()
  const q = await Question.create({
    product: productId,
    user: userId,
    userName: maskName(user.name),
    text,
  })
  return toPublicQuestion(q, [], userId)
}

export async function answer(
  actor: { id: string; role: string },
  questionId: string,
  text: string
) {
  const question = await Question.findOne({ _id: questionId, status: "published" })
  if (!question) throw ApiError.notFound("Question not found")
  const [user, product] = await Promise.all([
    User.findById(actor.id).select("name").lean(),
    Product.findById(question.product).select("seller").lean(),
  ])
  if (!user) throw ApiError.unauthorized()
  const isSeller = Boolean(product?.seller && String(product.seller) === actor.id)
  const a = await Answer.create({
    question: question._id,
    product: question.product,
    user: actor.id,
    userName: maskName(user.name),
    text,
    badge: isSeller ? "seller" : actor.role === "admin" ? "staff" : undefined,
    verifiedBuyer: await hasPurchased(actor.id, String(question.product)),
  })
  await Question.updateOne({ _id: question._id }, { $inc: { answerCount: 1 } })
  return toPublicAnswer(a, actor.id)
}

type Kind = "question" | "answer"
type Votable = { user: Types.ObjectId; upvotes: number; status: string }
const modelFor = (k: Kind) =>
  (k === "question" ? Question : Answer) as unknown as Model<Votable>

export async function setUpvote(userId: string, kind: Kind, id: string, on: boolean) {
  const target = await modelFor(kind)
    .findOne({ _id: id, status: "published" })
    .select("user upvotes")
  if (!target)
    throw ApiError.notFound(`${kind === "question" ? "Question" : "Answer"} not found`)
  if (String(target.user) === userId)
    throw new ApiError(403, "OWN_CONTENT", "You cannot upvote your own post")
  if (on) {
    const res = await Vote.updateOne(
      { kind, target: id, user: userId },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    )
    if (res.upsertedCount === 1)
      await modelFor(kind).updateOne({ _id: id }, { $inc: { upvotes: 1 } })
  } else {
    const res = await Vote.deleteOne({ kind, target: id, user: userId })
    if (res.deletedCount === 1)
      await modelFor(kind).updateOne({ _id: id }, { $inc: { upvotes: -1 } })
  }
  const fresh = await modelFor(kind).findById(id).select("upvotes").lean()
  return { upvotes: fresh?.upvotes ?? 0, myVote: on }
}

export async function remove(
  actor: { id: string; role: string },
  kind: Kind,
  id: string
) {
  const own = actor.role === "admin" ? {} : { user: actor.id }
  if (kind === "question") {
    const q = await Question.findOneAndDelete({ _id: id, ...own })
    if (!q) throw ApiError.notFound("Question not found")
    const answers = await Answer.find({ question: q._id }).select("_id").lean()
    await Promise.all([
      Answer.deleteMany({ question: q._id }),
      Vote.deleteMany({
        $or: [
          { kind: "question", target: q._id },
          { kind: "answer", target: { $in: answers.map((a) => a._id) } },
        ],
      }),
    ])
  } else {
    const a = await Answer.findOneAndDelete({ _id: id, ...own })
    if (!a) throw ApiError.notFound("Answer not found")
    await Promise.all([
      Question.updateOne(
        { _id: a.question, answerCount: { $gt: 0 } },
        { $inc: { answerCount: -1 } }
      ),
      Vote.deleteMany({ kind: "answer", target: a._id }),
    ])
  }
}

export async function adminListQuestions(q: {
  page: number
  limit: number
  status?: string
  unanswered?: boolean
}) {
  const filter: { status?: "published" | "hidden"; answerCount?: number } = {}
  if (q.status) filter.status = q.status as "published" | "hidden"
  if (q.unanswered) filter.answerCount = 0
  const [items, total] = await Promise.all([
    Question.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Question.countDocuments(filter),
  ])
  // The moderation queue needs the product's name and EVERY answer (hidden ones too, to unhide).
  const [products, answers] = await Promise.all([
    Product.find({ _id: { $in: items.map((i) => i.product) } })
      .select("name slug")
      .lean(),
    Answer.find({ question: { $in: items.map((i) => i._id) } })
      .sort({ createdAt: 1 })
      .lean(),
  ])
  const byProduct = new Map(products.map((p) => [String(p._id), p]))
  return {
    items: items.map((i) => ({
      ...toPublicQuestion(
        i,
        answers
          .filter((a) => String(a.question) === String(i._id))
          .map((a) => ({ ...toPublicAnswer(a), status: a.status }))
      ),
      product: {
        name: byProduct.get(String(i.product))?.name ?? "(deleted product)",
        slug: byProduct.get(String(i.product))?.slug ?? null,
      },
    })),
    total,
  }
}

export async function moderateQa(kind: Kind, id: string, status: "published" | "hidden") {
  const doc = await modelFor(kind).findByIdAndUpdate(
    id,
    { status },
    { returnDocument: "after" }
  )
  if (!doc) throw ApiError.notFound("Not found")
  return { id, kind, status }
}
