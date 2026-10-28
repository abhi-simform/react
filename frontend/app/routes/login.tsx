import { LoginForm } from "@/features/auth"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function LoginRoute() {
  return <LoginForm />
}

export function meta() {
  return noindexMeta("Log in")
}

export const handle = { breadcrumb: "Log in" } satisfies RouteHandle
