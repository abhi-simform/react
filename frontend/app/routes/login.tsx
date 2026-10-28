import { LoginForm } from "@/features/auth"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function LoginRoute() {
  return <LoginForm />
}

export function meta() {
  return [{ title: pageTitle("Log in") }]
}

export const handle = { breadcrumb: "Log in" } satisfies RouteHandle
