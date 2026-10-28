import { lazy, Suspense, useState } from "react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ProductDetailVM } from "@/features/catalog"

import { useAddReview, useQuestions, useReviews } from "../hooks/useReviews"
import { AsyncView } from "@/components/common/AsyncView"
import { toAsyncState } from "@/lib/queryState"
import { ReviewList } from "./ReviewList"

// The review editor is big and most visitors never write a review: load it on demand.
const ReviewForm = lazy(() =>
  import("./ReviewForm").then((m) => ({ default: m.ReviewForm }))
)

const TABS = ["description", "specs", "reviews", "qa"] as const
type TabName = (typeof TABS)[number]
const isTab = (v: string | null): v is TabName => TABS.some((t) => t === v)

/**
 * The active tab lives in the URL (`?tab=reviews`, 8.4 migration): a link can point at the
 * reviews, a reload keeps the tab, and Back works. No param = the default tab, so the
 * canonical URL stays clean. `replace` keeps tab clicks out of the history stack.
 */
export function ProductTabs({ product }: { product: ProductDetailVM }) {
  const [writing, setWriting] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const param = searchParams.get("tab")
  const tab: TabName = isTab(param) ? param : "description"

  // DEPENDENT queries (9.9): they need the real product (its id), so they start only after it
  // arrived; they live HERE (always mounted) rather than in the tab panels, so the requests start
  // right after the product instead of when a tab is opened. Each section has its own
  // loading/error state: a failing reviews list does not touch the Q&A or the rest of the page.
  // Dev demos: `?failReviewsPage=3`, `?failQuestions=1`.
  const failPage = Number(searchParams.get("failReviewsPage")) || undefined
  const reviews = useReviews(
    product.id,
    true,
    import.meta.env.DEV ? failPage : undefined
  )
  const questions = useQuestions(
    product.id,
    true,
    import.meta.env.DEV && searchParams.has("failQuestions")
  )
  const addReview = useAddReview(product.id, product.slug)

  function onTabChange(next: unknown) {
    if (!isTab(typeof next === "string" ? next : null)) return
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (next === "description") params.delete("tab")
        else params.set("tab", String(next))
        return params
      },
      { replace: true, preventScrollReset: true }
    )
  }

  return (
    <Tabs value={tab} onValueChange={onTabChange}>
      <TabsList>
        <TabsTrigger value="description">Description</TabsTrigger>
        <TabsTrigger value="specs">Specifications</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
        <TabsTrigger value="qa">Q&amp;A</TabsTrigger>
      </TabsList>
      <TabsContent value="description" className="text-sm">
        <p>{product.description}</p>
        <ul className="mt-2 list-disc pl-5">
          {product.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </TabsContent>
      <TabsContent value="specs">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          {product.specs.map((s) => (
            <div key={s.key} className="contents">
              <dt className="font-medium">{s.key}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      </TabsContent>
      <TabsContent value="reviews" className="text-sm">
        <p className="my-3">
          {product.rating
            ? `${product.rating.countLabel} ratings, average ${product.rating.value.toFixed(1)}.`
            : "No ratings yet."}{" "}
        </p>
        <ReviewList reviews={reviews} />
        {writing ? (
          <Suspense
            fallback={<p role="status">Loading the review editor...</p>}
          >
            <ReviewForm
              onSubmit={async (payload) => {
                await addReview.mutateAsync({
                  rating: payload.rating,
                  text: payload.text,
                })
                toast.success("Thanks for your review")
                setWriting(false)
              }}
            />
          </Suspense>
        ) : (
          <Button variant="outline" onClick={() => setWriting(true)}>
            Write a review
          </Button>
        )}
      </TabsContent>
      <TabsContent value="qa" className="text-sm">
        <AsyncView
          state={toAsyncState(questions)}
          loading={<p aria-busy="true">Loading questions...</p>}
          empty={(list) => list.length === 0 && <p>No questions yet.</p>}
        >
          {(list) => (
            <ul className="flex flex-col gap-2">
              {list.map((q) => (
                <li key={q.id}>
                  <p className="font-medium">Q: {q.question}</p>
                  <p>{q.answer ? `A: ${q.answer}` : "Not answered yet."}</p>
                </li>
              ))}
            </ul>
          )}
        </AsyncView>
      </TabsContent>
    </Tabs>
  )
}
