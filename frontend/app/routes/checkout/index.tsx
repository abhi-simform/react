import { Navigate } from "react-router"

/** `/checkout` has no page of its own: it is step one. */
export default function CheckoutIndexRoute() {
  return <Navigate to="/checkout/address" replace />
}
