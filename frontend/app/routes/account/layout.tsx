import { Outlet } from "react-router"

export default function AccountLayout() {
  return (
    <div className="p-4">
      <p className="text-sm text-neutral-500">account layout (sidebar later)</p>
      <Outlet />
    </div>
  )
}
