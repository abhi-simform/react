import { Suspense } from "react"

import { lazyNamed } from "@/lib/lazyNamed"

// `motion/react` (AnimatePresence, LazyMotion) is ~18 kB gzip. The cart feature is part of the first
// download (header button, store), so the animated list is its own chunk, fetched when a cart list is
// first shown. Until then (one frame to a few hundred ms) the same lines render in a plain <ul>.
const AnimatedLines = lazyNamed(
  () => import("./AnimatedLines"),
  "AnimatedLines"
)

export function CartLineList({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ul>{children}</ul>}>
      <AnimatedLines>{children}</AnimatedLines>
    </Suspense>
  )
}
