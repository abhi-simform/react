import { Link, Outlet } from "react-router"

/** Throwaway labs from stages 1-4. Only available in dev builds. */
export default function DevLayout() {
  if (!import.meta.env.DEV) {
    return <p className="p-4">Dev labs are not part of production builds.</p>
  }
  return (
    <div>
      <p className="border-b p-2 text-sm">
        <Link to="/dev" className="underline">
          Dev labs
        </Link>
      </p>
      <Outlet />
    </div>
  )
}
