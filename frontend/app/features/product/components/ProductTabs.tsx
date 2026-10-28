import { SectionBoundary } from "@/components/common/SectionBoundary"
import { Suspense } from "react"
import { useSearchParams } from "react-router"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ProductDetailVM } from "@/features/catalog"

import { lazyNamed } from "@/lib/lazyNamed"
import { ReviewsSection } from "./ReviewsSection"

// 13.3: questions and answers (two react-hook-form forms) are their own chunk, fetched after the buy
// box and gallery instead of inside the product page's first download.
const QaSection = lazyNamed(() => import("./QaSection"), "QaSection")

const TABS = ["description", "specs", "reviews", "qa"] as const
type TabName = (typeof TABS)[number]
const isTab = (v: string | null): v is TabName => TABS.some((t) => t === v)

/**
 * The active tab lives in the URL (`?tab=reviews`, 8.4 migration): a link can point at the
 * reviews, a reload keeps the tab, and Back works. No param = the default tab, so the
 * canonical URL stays clean. `replace` keeps tab clicks out of the history stack.
 */
export function ProductTabs({ product }: { product: ProductDetailVM }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const param = searchParams.get("tab")
  // A shared review-filter link (`?reviews=4&rsort=newest`) implies the reviews tab.
  const hasReviewFilter = ["reviews", "rsort", "rphotos"].some((k) =>
    searchParams.has(k)
  )
  const tab: TabName = isTab(param)
    ? param
    : hasReviewFilter
      ? "reviews"
      : "description"

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
      <TabsContent value="reviews">
        <SectionBoundary label="reviews" resetKeys={[product.id]}>
          <ReviewsSection product={{ id: product.id, slug: product.slug }} />
        </SectionBoundary>
      </TabsContent>
      <TabsContent value="qa">
        <SectionBoundary label="questions and answers" resetKeys={[product.id]}>
          <Suspense
            fallback={
              <p role="status" className="min-h-24 text-sm">
                Loading questions...
              </p>
            }
          >
            <QaSection productId={product.id} />
          </Suspense>
        </SectionBoundary>
      </TabsContent>
    </Tabs>
  )
}
