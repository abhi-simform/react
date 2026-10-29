import { api, apiPaged } from "@/lib/api/client"

export type AdminReview = {
  id: string
  productId: string
  product: { name: string; slug: string }
  author: string
  rating: number
  title: string | null
  body: string
  photos: string[]
  verifiedPurchase: boolean
  status: "published" | "hidden"
  reportCount: number
  moderationNote: string | null
  createdAt: string
}
export type ReviewParams = {
  status?: "published" | "hidden"
  reported?: boolean
  limit: number
}
export const listReviews = (
  p: ReviewParams & { page: number },
  signal?: AbortSignal
) =>
  apiPaged<AdminReview>("/admin/reviews", {
    query: { ...p, reported: p.reported ? "true" : undefined },
    signal,
  })
export const moderateReview = (
  id: string,
  status: "published" | "hidden",
  note?: string
) =>
  api<AdminReview>(`/admin/reviews/${id}/moderate`, {
    method: "POST",
    body: { status, note },
  })

export type AdminAnswer = {
  id: string
  author: string
  text: string
  badge: "seller" | "staff" | null
  status: "published" | "hidden"
  createdAt: string
}
export type AdminQuestion = {
  id: string
  productId: string
  product: { name: string; slug: string | null }
  author: string
  text: string
  answerCount: number
  status: "published" | "hidden"
  answers: AdminAnswer[]
  createdAt: string
}
export const listQuestions = (
  p: { status?: string; unanswered?: boolean; page: number; limit: number },
  signal?: AbortSignal
) =>
  apiPaged<AdminQuestion>("/admin/questions", {
    query: { ...p, unanswered: p.unanswered ? "true" : undefined },
    signal,
  })
export const moderateQuestion = (id: string, status: "published" | "hidden") =>
  api(`/admin/questions/${id}/moderate`, { method: "POST", body: { status } })
export const moderateAnswer = (id: string, status: "published" | "hidden") =>
  api(`/admin/answers/${id}/moderate`, { method: "POST", body: { status } })
/** Staff answer: any signed-in user can answer; the API badges an admin's answer "staff". */
export const answerQuestion = (id: string, text: string) =>
  api(`/questions/${id}/answers`, { method: "POST", body: { text } })
