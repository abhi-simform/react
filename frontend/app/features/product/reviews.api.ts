import { ApiError } from "@/lib/api/errors"
import type { PageMeta, Paginated } from "@/lib/api/envelope"
import { abortable } from "@/lib/async"

/**
 * STUB until the reviews backend phase (B7, Stage 11): the reviews and Q&A endpoints do not
 * exist yet, so these functions behave like them over generated in-memory data (deterministic
 * per product id, 23 reviews each, newest first), with fake latency and an abort-aware delay.
 * The query factories in `queries.ts` call ONLY these functions, so swapping in the real API
 * (`api("/products/:id/reviews")`) changes this file and nothing in components or hooks.
 */
export type ReviewItem = {
  id: string
  author: string
  rating: 1 | 2 | 3 | 4 | 5
  title: string
  body: string
  createdAt: string
  verifiedPurchase: boolean
}
export type Question = { id: string; question: string; answer: string | null }

const NAMES = ["Asha", "Ravi", "Meera", "Kabir", "Isha", "Dev", "Noor", "Vik"]
const TITLES = [
  "Worth it",
  "Decent",
  "Great value",
  "Not as expected",
  "Love it",
]
const TOTAL = 23

/** Tiny deterministic hash so every product gets stable, different reviews. */
function seed(text: string): number {
  let h = 2166136261
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

const added = new Map<string, ReviewItem[]>() // reviews written in this session

function generated(productId: string): ReviewItem[] {
  const base = seed(productId)
  return Array.from({ length: TOTAL }, (_, i) => {
    const n = (base + i * 7919) >>> 0
    return {
      id: `${productId}-r${i}`,
      author: NAMES[n % NAMES.length]!,
      rating: ((n % 5) + 1) as ReviewItem["rating"],
      title: TITLES[n % TITLES.length]!,
      body: `Review ${i + 1}: used it for a few weeks and it ${n % 2 ? "held up well" : "does the job"}.`,
      createdAt: new Date(Date.UTC(2026, 9, 28 - i)).toISOString(),
      verifiedPurchase: n % 3 !== 0,
    }
  })
}

const allReviews = (productId: string) => [
  ...(added.get(productId) ?? []),
  ...generated(productId),
]

export type ReviewsOptions = {
  page: number
  limit?: number
  /** Dev demo: this page number fails with a 500 (`?failReviewsPage=3`). */
  failPage?: number
  signal?: AbortSignal
}

export async function getReviews(
  productId: string,
  { page, limit = 5, failPage, signal }: ReviewsOptions
): Promise<Paginated<ReviewItem>> {
  await abortable(450, signal)
  if (failPage === page)
    throw new ApiError({
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Demo failure",
    })
  const all = allReviews(productId)
  const totalPages = Math.max(1, Math.ceil(all.length / limit))
  const meta: PageMeta = {
    page,
    limit,
    total: all.length,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
  return { items: all.slice((page - 1) * limit, page * limit), meta }
}

export async function addReview(
  productId: string,
  input: { rating: number; text: string }
): Promise<ReviewItem> {
  await abortable(400)
  const review: ReviewItem = {
    id: `${productId}-new-${Date.now()}`,
    author: "You",
    rating: input.rating as ReviewItem["rating"],
    title: "Your review",
    body: input.text,
    createdAt: new Date().toISOString(),
    verifiedPurchase: false,
  }
  added.set(productId, [review, ...(added.get(productId) ?? [])])
  return review
}

export async function getQuestions(
  productId: string,
  signal?: AbortSignal,
  fail = false
): Promise<Question[]> {
  await abortable(700, signal)
  if (fail)
    throw new ApiError({
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Demo failure",
    })
  const n = seed(productId) % 3
  return Array.from({ length: n + 1 }, (_, i) => ({
    id: `${productId}-q${i}`,
    question: [
      "Is it covered by warranty?",
      "Does it come in other colours?",
      "How long is delivery?",
    ][i % 3]!,
    answer: i % 2 === 0 ? "Yes, see the specifications tab." : null,
  }))
}
