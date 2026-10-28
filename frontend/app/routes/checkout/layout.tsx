import { Outlet } from "react-router"

import { CheckoutNav, CheckoutStepper } from "@/features/checkout"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function CheckoutLayout() {
  return (
    <div className="mx-auto max-w-3xl p-4">
      <CheckoutStepper />
      <Outlet />
      <CheckoutNav />
    </div>
  )
}

export function meta() {
  return [{ title: pageTitle("Checkout") }]
}

export const handle = { breadcrumb: "Checkout" } satisfies RouteHandle
