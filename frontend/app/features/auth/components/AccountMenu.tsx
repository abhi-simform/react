import { useT } from "@/features/i18n"
import { Link, NavLink, useNavigate } from "react-router"

import { paths } from "@/lib/paths"
import { cn } from "@/lib/utils"

import { useAuth } from "../AuthProvider"

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn("rounded px-1", isActive && "bg-muted font-medium")

/**
 * Header account area. Role-specific links are UX only (10.4): the API enforces roles itself
 * (`/seller/*` answers 403 to a customer however the link got there).
 */
export function AccountMenu() {
  const t = useT("common")
  const { status, user, logout } = useAuth()
  const navigate = useNavigate()

  if (status === "loading")
    return (
      <span aria-busy="true" className="text-muted-foreground">
        ...
      </span>
    )
  if (status === "anonymous" || !user)
    return (
      <>
        <NavLink to={paths.login()} className={navClass}>
          {t("nav.login")}
        </NavLink>
        <NavLink to={paths.register()} className={navClass}>
          {t("nav.signup")}
        </NavLink>
      </>
    )

  return (
    <details className="relative">
      <summary className="cursor-pointer rounded px-1 select-none">
        {user.name}
        {user.role !== "customer" && (
          <span className="ms-1 text-xs text-muted-foreground">
            ({user.role})
          </span>
        )}
      </summary>
      <ul className="absolute end-0 z-20 mt-1 flex min-w-44 flex-col gap-1 rounded border bg-background p-2 shadow">
        <li>
          <Link to={paths.account()}>{t("account.account")}</Link>
        </li>
        <li>
          <Link to={paths.orders()}>{t("account.orders")}</Link>
        </li>
        <li>
          <Link to={paths.accountPage("security")}>
            {t("account.security")}
          </Link>
        </li>
        {(user.role === "seller" || user.role === "admin") && (
          <li>
            <Link to={paths.seller()}>{t("account.seller")}</Link>
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
            {t("account.logout")}
          </button>
        </li>
      </ul>
    </details>
  )
}
