import { VerifyEmailPage } from "@/features/auth"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function VerifyEmailRoute() {
  return <VerifyEmailPage />
}

export function meta() {
  return [
    { title: pageTitle("Verify your email") },
    // The URL may carry a one-time token: never leak it through the Referer header.
    { name: "robots", content: "noindex, nofollow" },
    { name: "referrer", content: "no-referrer" },
  ]
}

export const handle = { breadcrumb: "Verify email" } satisfies RouteHandle
