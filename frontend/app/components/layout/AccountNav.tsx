import { NavLink } from "react-router"

import { cn } from "@/lib/utils"

const LINKS = [
  { to: "/account", label: "Overview", end: true },
  { to: "/account/profile", label: "Profile" },
  { to: "/account/addresses", label: "Addresses" },
  { to: "/account/security", label: "Security" },
  { to: "/account/notifications", label: "Notifications" },
  { to: "/account/payments", label: "Payments" },
  { to: "/orders", label: "Orders" },
] as const

/** `end` makes "Overview" active only at exactly /account, not for every nested page. */
export function AccountNav() {
  return (
    <nav
      aria-label="Account"
      className="flex flex-row flex-wrap gap-2 md:flex-col"
    >
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={"end" in link}
          className={({ isActive }) =>
            cn(
              "rounded px-2 py-1 text-sm",
              isActive && "bg-neutral-200 font-medium"
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
