import { Link, NavLink, useNavigate } from "react-router"

import { paths } from "@/lib/paths"
import { cn } from "@/lib/utils"

import { useAuth } from "../AuthProvider"

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn("rounded px-1", isActive && "bg-neutral-200 font-medium")

/**
 * Header account area. Role-specific links are UX only (10.4): the API enforces roles itself
 * (`/seller/*` answers 403 to a customer however the link got there).
 */
export function AccountMenu() {
  const { status, user, logout } = useAuth()
  const navigate = useNavigate()

  if (status === "loading")
    return (
      <span aria-busy="true" className="text-neutral-400">
        ...
      </span>
    )
  if (status === "anonymous" || !user)
    return (
      <>
        <NavLink to={paths.login()} className={navClass}>
          Log in
        </NavLink>
        <NavLink to={paths.register()} className={navClass}>
          Sign up
        </NavLink>
      </>
    )

  return (
    <details className="relative">
      <summary className="cursor-pointer rounded px-1 select-none">
        {user.name}
        {user.role !== "customer" && (
          <span className="ml-1 text-xs text-neutral-500">({user.role})</span>
        )}
      </summary>
      <ul className="absolute right-0 z-20 mt-1 flex min-w-44 flex-col gap-1 rounded border bg-white p-2 shadow dark:bg-neutral-900">
        <li>
          <Link to={paths.account()}>Account</Link>
        </li>
        <li>
          <Link to={paths.orders()}>Orders</Link>
        </li>
        <li>
          <Link to={paths.accountPage("security")}>Security</Link>
        </li>
        {(user.role === "seller" || user.role === "admin") && (
          <li>
            <Link to={paths.seller()}>Seller dashboard</Link>
          </li>
        )}
        <li>
          <button
            type="button"
            className="underline"
            onClick={() => {
              void logout()
              navigate(paths.home()) // (from a protected page the guard also goes home)
            }}
          >
            Log out
          </button>
        </li>
      </ul>
    </details>
  )
}
