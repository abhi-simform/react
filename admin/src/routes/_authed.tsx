import { useSyncExternalStore } from "react"
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useMatches,
} from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { can, isStaff, type Permission } from "@/lib/auth/can"
import { getUser, subscribe } from "@/lib/auth/session"
import { useSignOut } from "@/lib/auth/useSignOut"
import { useLiveOrders, useUnseenOrders } from "@/features/orders/useLiveOrders"

// The guard. Every route under `_authed/` runs this BEFORE its loader and before anything renders:
// 1. restore the session (one POST /auth/refresh after a reload),
// 2. no session -> /login?redirect=<where you were going>,
// 3. a customer (or any non-staff role) -> /forbidden. No admin component or data ever mounts.
export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context, location }) => {
    const user = await context.auth.ensureSession()
    if (!user)
      throw redirect({ to: "/login", search: { redirect: location.href } })
    if (!isStaff(user))
      throw redirect({ to: "/forbidden", search: { reason: "role" } })
    return { user }
  },
  component: Shell,
})

type NavItem = {
  to:
    | "/"
    | "/products"
    | "/categories"
    | "/brands"
    | "/users"
    | "/orders"
    | "/returns"
    | "/coupons"
    | "/deals"
    | "/banners"
    | "/reviews"
    | "/questions"
  label: string
  permission: Permission
}
const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", permission: "dashboard:view" },
  { to: "/orders", label: "Orders", permission: "orders:read" },
  { to: "/returns", label: "Returns", permission: "returns:manage" },
  { to: "/products", label: "Products", permission: "products:read" },
  { to: "/categories", label: "Categories", permission: "categories:manage" },
  { to: "/brands", label: "Brands", permission: "brands:manage" },
  { to: "/users", label: "Users", permission: "users:manage" },
  { to: "/coupons", label: "Coupons", permission: "marketing:manage" },
  { to: "/deals", label: "Deals", permission: "marketing:manage" },
  { to: "/banners", label: "Banners", permission: "marketing:manage" },
  { to: "/reviews", label: "Reviews", permission: "moderation:manage" },
  { to: "/questions", label: "Q&A", permission: "moderation:manage" },
]

function Shell() {
  // Subscribed, not read once: a sign-out in another tab/handler updates the topbar.
  const user = useSyncExternalStore(subscribe, getUser, getUser)
  const signOut = useSignOut()
  // Admins get live order pushes over the staff socket (sellers have no staff room).
  useLiveOrders(user?.role === "admin")
  const unseen = useUnseenOrders()
  const matches = useMatches()
  const crumbs = matches.flatMap((m) =>
    m.staticData.crumb
      ? [{ id: m.id, label: m.staticData.crumb, to: m.pathname }]
      : []
  )

  return (
    <div className="grid min-h-svh grid-cols-[13rem_1fr]">
      <nav aria-label="Main" className="border-r bg-muted/40 p-4">
        <p className="mb-4 font-semibold">ShopSphere Admin</p>
        <ul className="flex flex-col gap-1 text-sm">
          {NAV.filter((i) => can(user, i.permission)).map((i) => (
            <li key={i.to}>
              <Link
                to={i.to}
                activeOptions={{ exact: i.to === "/" }}
                className="block rounded px-2 py-1 hover:bg-muted [&.active]:bg-muted [&.active]:font-medium"
              >
                {i.label}
                {i.to === "/orders" && unseen > 0 ? (
                  <span
                    className="ml-2 rounded-full bg-primary px-1.5 text-xs text-primary-foreground"
                    aria-label={`${unseen} new orders`}
                  >
                    {unseen}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-2 text-sm">
          <nav aria-label="Breadcrumb">
            <ol className="flex gap-1">
              {crumbs.map((c, i) => (
                <li key={c.id} className="flex gap-1">
                  {i > 0 ? <span aria-hidden>/</span> : null}
                  {i === crumbs.length - 1 ? (
                    <span aria-current="page">{c.label}</span>
                  ) : (
                    <Link to={c.to}>{c.label}</Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <div className="flex items-center gap-3">
            <span>
              {user?.name}{" "}
              <span className="text-muted-foreground">({user?.role})</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
