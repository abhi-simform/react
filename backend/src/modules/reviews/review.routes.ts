import { Router } from "express"
import { authenticate, authorize, optionalAuth } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import * as c from "./review.controller.js"
import * as S from "./review.schema.js"

/** Mounted at /products/:productId (before the product router so /:idOrSlug does not swallow these). */
export const productReviewRoutes = Router({ mergeParams: true })
productReviewRoutes.get("/reviews/summary", validate(S.productIdSchema), c.summary)
productReviewRoutes.get(
  "/reviews/eligibility",
  authenticate,
  validate(S.productIdSchema),
  c.eligibility
)
productReviewRoutes.get("/reviews", optionalAuth, validate(S.listReviewsSchema), c.list)
productReviewRoutes.post(
  "/reviews",
  authenticate,
  validate(S.createReviewSchema),
  c.create
)
productReviewRoutes.get(
  "/questions",
  optionalAuth,
  validate(S.listQuestionsSchema),
  c.questions
)
productReviewRoutes.post("/questions", authenticate, validate(S.askSchema), c.ask)

export const reviewRoutes = Router()
reviewRoutes.patch("/:id", authenticate, validate(S.updateReviewSchema), c.update)
reviewRoutes.delete("/:id", authenticate, validate(S.reviewIdSchema), c.remove)
reviewRoutes.put(
  "/:id/helpful",
  authenticate,
  validate(S.reviewIdSchema),
  c.helpful(true)
)
reviewRoutes.delete(
  "/:id/helpful",
  authenticate,
  validate(S.reviewIdSchema),
  c.helpful(false)
)
reviewRoutes.post("/:id/report", authenticate, validate(S.reportSchema), c.report)

export const questionRoutes = Router()
questionRoutes.get("/:id/answers", optionalAuth, validate(S.listAnswersSchema), c.answers)
questionRoutes.post("/:id/answers", authenticate, validate(S.answerSchema), c.answer)
questionRoutes.put(
  "/:id/upvote",
  authenticate,
  validate(S.reviewIdSchema),
  c.upvote("question", true)
)
questionRoutes.delete(
  "/:id/upvote",
  authenticate,
  validate(S.reviewIdSchema),
  c.upvote("question", false)
)
questionRoutes.delete(
  "/:id",
  authenticate,
  validate(S.reviewIdSchema),
  c.removeQa("question")
)

export const answerRoutes = Router()
answerRoutes.put(
  "/:id/upvote",
  authenticate,
  validate(S.reviewIdSchema),
  c.upvote("answer", true)
)
answerRoutes.delete(
  "/:id/upvote",
  authenticate,
  validate(S.reviewIdSchema),
  c.upvote("answer", false)
)
answerRoutes.delete(
  "/:id",
  authenticate,
  validate(S.reviewIdSchema),
  c.removeQa("answer")
)

// Moderation (admin).
export const adminReviewRoutes = Router()
adminReviewRoutes.use(authenticate, authorize("admin"))
adminReviewRoutes.get("/reviews", validate(S.adminListReviewsSchema), c.adminList)
adminReviewRoutes.post("/reviews/:id/moderate", validate(S.moderateSchema), c.moderate)
adminReviewRoutes.get(
  "/questions",
  validate(S.adminListQuestionsSchema),
  c.adminQuestions
)
adminReviewRoutes.post(
  "/questions/:id/moderate",
  validate(S.moderateSchema),
  c.moderateQa("question")
)
adminReviewRoutes.post(
  "/answers/:id/moderate",
  validate(S.moderateSchema),
  c.moderateQa("answer")
)
