// Compile-time checks only (never executed).
import { List } from "../app/components/common/List.tsx"
import { QuantityInput } from "../app/components/common/QuantityInput.tsx"
import { Rating } from "../app/components/common/Rating.tsx"
import { useToggle } from "../app/hooks/useToggle.ts"
import type { Order, Product } from "../app/types/domain.ts"

declare const products: Product[]

export function Checks() {
  // typed tuple, not (boolean | (() => void) | ...)[]
  const [on, toggle, setOn] = useToggle()
  const b: boolean = on
  const f: () => void = toggle
  setOn(true)
  // @ts-expect-error setOn takes a boolean
  setOn("yes")
  // @ts-expect-error a tuple of 3 has no 4th element
  const [, , , fourth] = useToggle()

  return (
    <>
      {/* T is inferred as Product: `p.name` exists */}
      <List items={products} getKey={(p) => p._id} renderItem={(p) => p.name} />
      <List
        items={products}
        getKey={(p) => p._id}
        // @ts-expect-error Product has no `title` (the plan's old name)
        renderItem={(p) => p.title}
      />
      <List
        // @ts-expect-error renderItem wants an Order, so `items` (Products) is rejected
        items={products}
        getKey={(p) => p._id}
        renderItem={(o: Order) => o.orderNumber}
      />
      <Rating value={4} size="sm" data-testid="r" title="rating" />
      {/* @ts-expect-error size is "sm" | "md" */}
      <Rating value={4} size="xl" />
      <QuantityInput
        value={1}
        onValueChange={(n: number) => void n}
        aria-label="Quantity"
      />
      {/* @ts-expect-error `value` must be a number */}
      <QuantityInput value="1" onValueChange={() => {}} />
      {String(b) + String(f) + String(fourth)}
    </>
  )
}
