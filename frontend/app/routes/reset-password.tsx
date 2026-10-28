import { ResetPasswordForm } from "@/features/auth"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function ResetPasswordRoute() {
  return <ResetPasswordForm />
}

export function meta() {
  return [
    { title: pageTitle("Reset password") },
    // The URL may carry a one-time token: never leak it through the Referer header.
    { name: "referrer", content: "no-referrer" },
  ]
}

export const handle = { breadcrumb: "Reset password" } satisfies RouteHandle
