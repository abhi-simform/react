import { lazy, Suspense, useState } from "react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ProductDetail } from "@/features/catalog"

// The review editor is big and most visitors never write a review: load it on demand.
const ReviewForm = lazy(() =>
  import("./ReviewForm").then((m) => ({ default: m.ReviewForm }))
)

export function ProductTabs({ product }: { product: ProductDetail }) {
  const [writing, setWriting] = useState(false)
  return (
    <Tabs defaultValue="description">
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
        <p className="mb-4">
          {product.ratingCount.toLocaleString("en-IN")} ratings, average{" "}
          {product.ratingAvg}. The review list arrives with the reviews backend
          phase.
        </p>
        {writing ? (
          <Suspense
            fallback={<p role="status">Loading the review editor...</p>}
          >
            <ReviewForm />
          </Suspense>
        ) : (
          <Button variant="outline" onClick={() => setWriting(true)}>
            Write a review
          </Button>
        )}
      </TabsContent>
      <TabsContent value="qa" className="text-sm">
        No questions yet.
      </TabsContent>
    </Tabs>
  )
}
