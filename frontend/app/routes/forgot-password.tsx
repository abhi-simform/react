import { ForgotPasswordForm } from "@/features/auth"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function ForgotPasswordRoute() {
  return <ForgotPasswordForm />
}

export function meta() {
  return [{ title: pageTitle("Forgot password") }]
}

export const handle = { breadcrumb: "Forgot password" } satisfies RouteHandle
