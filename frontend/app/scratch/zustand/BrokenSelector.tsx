// 8.3 BROKEN ON PURPOSE (mounted only with `?broken=1` on /dev/state). Do not copy.
// The selector returns a NEW object on every call. zustand compares selector results with
// `Object.is`, and `useSyncExternalStore` calls the selector to read a snapshot: it is never
// the same object twice, so React thinks the store changed on every read and loops
// ("The result of getSnapshot should be cached" / "Maximum update depth exceeded").
// The fixed versions live in ZustandLab: a primitive selector, or `useShallow`.
import { useCartStore } from "@/features/cart"

export function BrokenSelector() {
  const { count } = useCartStore((s) => ({ count: s.lines.length }))
  return <p>count: {count}</p>
}
