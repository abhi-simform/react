import type { RequestHandler } from "express"
import { valid } from "../../middleware/validate.js"
import { pageMeta } from "../../utils/pagination.js"
import { noContent, ok, created } from "../../utils/response.js"
import * as qa from "./qa.service.js"
import { Review, toPublicReview } from "./review.model.js"
import * as service from "./review.service.js"
import type * as S from "./review.schema.js"

const uid = (req: Parameters<RequestHandler>[0]) => req.user!.id
const actor = (req: Parameters<RequestHandler>[0]) => ({
  id: req.user!.id,
  role: req.user!.role,
})

export const summary: RequestHandler = async (req, res) => {
  const { params } = valid<typeof S.productIdSchema>(req)
  ok(res, await service.summary(params.productId))
}

export const list: RequestHandler = async (req, res) => {
  const { params, query } = valid<typeof S.listReviewsSchema>(req)
  const { items, total, voted } = await service.listReviews(
    params.productId,
    query,
    req.user?.id
  )
  ok(
    res,
    items.map((r) => toPublicReview(r, req.user?.id, voted)),
    pageMeta(query.page, query.limit, total)
  )
}

export const eligibility: RequestHandler = async (req, res) => {
  const { params } = valid<typeof S.productIdSchema>(req)
  const e = await service.eligibility(uid(req), params.productId)
  ok(res, { ...e, review: e.review ? toPublicReview(e.review, uid(req)) : null })
}

export const create: RequestHandler = async (req, res) => {
  const { params, body } = valid<typeof S.createReviewSchema>(req)
  created(
    res,
    toPublicReview(await service.createReview(uid(req), params.productId, body), uid(req))
  )
}

export const update: RequestHandler = async (req, res) => {
  const { params, body } = valid<typeof S.updateReviewSchema>(req)
  ok(res, toPublicReview(await service.updateReview(uid(req), params.id, body), uid(req)))
}

export const remove: RequestHandler = async (req, res) => {
  const { params } = valid<typeof S.reviewIdSchema>(req)
  await service.deleteReview(actor(req), params.id)
  noContent(res)
}

export const helpful =
  (on: boolean): RequestHandler =>
  async (req, res) => {
    const { params } = valid<typeof S.reviewIdSchema>(req)
    ok(res, await service.setHelpful(uid(req), params.id, on))
  }

export const report: RequestHandler = async (req, res) => {
  const { params } = valid<typeof S.reportSchema>(req)
  ok(res, await service.reportReview(uid(req), params.id))
}

export const adminList: RequestHandler = async (req, res) => {
  const { query } = valid<typeof S.adminListReviewsSchema>(req)
  const { items, total } = await service.adminList(query)
  ok(
    res,
    items.map((r) => ({
      ...toPublicReview(r as never),
      productId: String((r.product as { _id: unknown })._id),
      product: {
        name: (r.product as { name: string }).name,
        slug: (r.product as { slug: string }).slug,
      },
      reportCount: r.reportCount,
      moderationNote: r.moderationNote ?? null,
    })),
    pageMeta(query.page, query.limit, total)
  )
}

export const moderate: RequestHandler = async (req, res) => {
  const { params, body } = valid<typeof S.moderateSchema>(req)
  ok(res, toPublicReview(await service.moderate(params.id, body.status, body.note)))
}

// ---- Q&A ----
export const questions: RequestHandler = async (req, res) => {
  const { params, query } = valid<typeof S.listQuestionsSchema>(req)
  const { items, total } = await qa.listQuestions(params.productId, query, req.user?.id)
  ok(res, items, pageMeta(query.page, query.limit, total))
}
export const ask: RequestHandler = async (req, res) => {
  const { params, body } = valid<typeof S.askSchema>(req)
  created(res, await qa.ask(uid(req), params.productId, body.text))
}
export const answers: RequestHandler = async (req, res) => {
  const { params, query } = valid<typeof S.listAnswersSchema>(req)
  const { items, total } = await qa.listAnswers(params.id, query, req.user?.id)
  ok(res, items, pageMeta(query.page, query.limit, total))
}
export const answer: RequestHandler = async (req, res) => {
  const { params, body } = valid<typeof S.answerSchema>(req)
  created(res, await qa.answer(actor(req), params.id, body.text))
}
export const upvote =
  (kind: "question" | "answer", on: boolean): RequestHandler =>
  async (req, res) => {
    const { params } = valid<typeof S.reviewIdSchema>(req)
    ok(res, await qa.setUpvote(uid(req), kind, params.id, on))
  }
export const removeQa =
  (kind: "question" | "answer"): RequestHandler =>
  async (req, res) => {
    const { params } = valid<typeof S.reviewIdSchema>(req)
    await qa.remove(actor(req), kind, params.id)
    noContent(res)
  }
export const adminQuestions: RequestHandler = async (req, res) => {
  const { query } = valid<typeof S.adminListQuestionsSchema>(req)
  const { items, total } = await qa.adminListQuestions({
    ...query,
    unanswered: query.unanswered === "true",
  })
  ok(res, items, pageMeta(query.page, query.limit, total))
}
export const moderateQa =
  (kind: "question" | "answer"): RequestHandler =>
  async (req, res) => {
    const { params, body } = valid<typeof S.moderateSchema>(req)
    ok(res, await qa.moderateQa(kind, params.id, body.status))
  }
void Review
