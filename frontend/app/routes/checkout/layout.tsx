import { Outlet } from "react-router"

export default function CheckoutLayout() {
  return (
    <div className="p-4">
      <p className="text-sm text-neutral-500">
        checkout layout (stepper later)
      </p>
      <Outlet />
    </div>
  )
}
