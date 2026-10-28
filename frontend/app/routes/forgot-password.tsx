import { ForgotPasswordForm } from "@/features/auth"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function ForgotPasswordRoute() {
  return <ForgotPasswordForm />
}

export function meta() {
  return noindexMeta("Forgot password")
}

export const handle = { breadcrumb: "Forgot password" } satisfies RouteHandle
