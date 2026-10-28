import { RegisterForm } from "@/features/auth"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function RegisterRoute() {
  return <RegisterForm />
}

export function meta() {
  return [{ title: pageTitle("Create account") }]
}

export const handle = { breadcrumb: "Create account" } satisfies RouteHandle
