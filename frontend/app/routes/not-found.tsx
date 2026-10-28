import { NotFoundPage } from "@/components/common/NotFoundPage"

// The splat route: any URL no other route matched. It renders INSIDE the shell.
import { pageTitle } from "@/lib/pageTitle"

export default function NotFoundRoute() {
  return <NotFoundPage />
}

export function meta() {
  return [{ title: pageTitle("Page not found") }]
}
