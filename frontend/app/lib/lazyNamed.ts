import { lazy, type ComponentType } from "react"

/**
 * `React.lazy` wants a module with a DEFAULT export; this codebase uses named exports. One line
 * of glue so call sites stay readable:
 *   const CartSheet = lazyNamed(() => import("./CartSheet"), "CartSheet")
 */
export function lazyNamed<P, K extends string>(
  load: () => Promise<Record<K, ComponentType<P>>>,
  name: K
) {
  return lazy(() => load().then((m) => ({ default: m[name] })))
}
