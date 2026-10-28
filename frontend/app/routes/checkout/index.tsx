import { Navigate } from "react-router"
import { paths } from "@/lib/paths"

/** `/checkout` has no page of its own: it is step one. */
export default function CheckoutIndexRoute() {
  return <Navigate to={paths.checkoutStep("address")} replace />
}
