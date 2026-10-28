import { NotFoundPage } from "@/components/common/NotFoundPage"

// The splat route: any URL no other route matched. It renders INSIDE the shell.
import { noindexMeta } from "@/lib/seo"

export default function NotFoundRoute() {
  return <NotFoundPage />
}

export function meta() {
  return noindexMeta("Page not found")
}
