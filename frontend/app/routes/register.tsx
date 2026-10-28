import { RegisterForm } from "@/features/auth"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function RegisterRoute() {
  return <RegisterForm />
}

export function meta() {
  return noindexMeta("Create account")
}

export const handle = { breadcrumb: "Create account" } satisfies RouteHandle
