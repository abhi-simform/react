import { api, apiPaginated } from "@/lib/api/client"
import type { Paginated } from "@/lib/api/envelope"

import {
  answerSchema,
  eligibilitySchema,
  helpfulResultSchema,
  questionSchema,
  reviewSchema,
  reviewSummarySchema,
  upvoteResultSchema,
  type Answer,
  type Eligibility,
  type Question,
  type Review,
  type ReviewSummary,
} from "./reviews.schemas"

/**
 * The REAL reviews and Q&A API (B7). In Stages 7 and 9 this file was an in-memory stub with fake
 * latency; the query factories in `queries.ts` call only these functions, so replacing the stub
 * changed this file and the hooks' filter shape, not the components' data flow.
 * `auth: true` only attaches the token when there is one: anonymous readers are fine, and a
 * signed-in reader additionally gets `myVote` / `isMine`.
 */
export type ReviewSort = "helpful" | "newest" | "highest" | "lowest"
export type ReviewFilter = {
  rating?: 1 | 2 | 3 | 4 | 5
  sort: ReviewSort
  photos: boolean
}

const base = (productId: string) => `/products/${encodeURIComponent(productId)}`

export const getReviewSummary = (
  productId: string,
  signal?: AbortSignal
): Promise<ReviewSummary> =>
  api(`${base(productId)}/reviews/summary`, {
    schema: reviewSummarySchema,
    signal,
  })

export const getReviews = (
  productId: string,
  filter: ReviewFilter,
  page: number,
  signal?: AbortSignal
): Promise<Paginated<Review>> =>
  apiPaginated(`${base(productId)}/reviews`, {
    auth: true,
    query: {
      page,
      limit: 5,
      sort: filter.sort,
      rating: filter.rating,
      photos: filter.photos ? "true" : undefined,
    },
    schema: reviewSchema,
    signal,
  })

export const getEligibility = (
  productId: string,
  signal?: AbortSignal
): Promise<Eligibility> =>
  api(`${base(productId)}/reviews/eligibility`, {
    auth: true,
    schema: eligibilitySchema,
    signal,
  })

export type ReviewPayload = {
  rating: number
  title?: string
  body: string
  photos: string[]
}

export const createReview = (
  productId: string,
  payload: ReviewPayload
): Promise<Review> =>
  api(`${base(productId)}/reviews`, {
    method: "POST",
    auth: true,
    body: payload,
    schema: reviewSchema,
  })

export const updateReview = (
  id: string,
  payload: Partial<ReviewPayload>
): Promise<Review> =>
  api(`/reviews/${encodeURIComponent(id)}`, {
    method: "PATCH",
    auth: true,
    body: payload,
    schema: reviewSchema,
  })

export const deleteReview = (id: string): Promise<void> =>
  api(`/reviews/${encodeURIComponent(id)}`, { method: "DELETE", auth: true })

/** Idempotent on the server: PUT sets the vote, DELETE clears it. */
export const setHelpful = (id: string, on: boolean) =>
  api(`/reviews/${encodeURIComponent(id)}/helpful`, {
    method: on ? "PUT" : "DELETE",
    auth: true,
    schema: helpfulResultSchema,
  })

export const reportReview = (id: string, reason: string) =>
  api(`/reviews/${encodeURIComponent(id)}/report`, {
    method: "POST",
    auth: true,
    body: { reason },
  })

// ---- Q&A ----

export const getQuestions = (
  productId: string,
  sort: "helpful" | "newest",
  page: number,
  signal?: AbortSignal
): Promise<Paginated<Question>> =>
  apiPaginated(`${base(productId)}/questions`, {
    auth: true,
    query: { page, limit: 5, sort },
    schema: questionSchema,
    signal,
  })

export const getAnswers = (
  questionId: string,
  page: number,
  signal?: AbortSignal
): Promise<Paginated<Answer>> =>
  apiPaginated(`/questions/${encodeURIComponent(questionId)}/answers`, {
    auth: true,
    query: { page, limit: 10 },
    schema: answerSchema,
    signal,
  })

export const askQuestion = (
  productId: string,
  text: string
): Promise<Question> =>
  api(`${base(productId)}/questions`, {
    method: "POST",
    auth: true,
    body: { text },
    schema: questionSchema,
  })

export const answerQuestion = (
  questionId: string,
  text: string
): Promise<Answer> =>
  api(`/questions/${encodeURIComponent(questionId)}/answers`, {
    method: "POST",
    auth: true,
    body: { text },
    schema: answerSchema,
  })

export const setUpvote = (
  kind: "question" | "answer",
  id: string,
  on: boolean
) =>
  api(
    `/${kind === "question" ? "questions" : "answers"}/${encodeURIComponent(id)}/upvote`,
    {
      method: on ? "PUT" : "DELETE",
      auth: true,
      schema: upvoteResultSchema,
    }
  )

export const deleteQa = (
  kind: "question" | "answer",
  id: string
): Promise<void> =>
  api(
    `/${kind === "question" ? "questions" : "answers"}/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      auth: true,
    }
  )
