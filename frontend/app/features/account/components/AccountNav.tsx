import { NavLink } from "react-router"

import { cn } from "@/lib/utils"
import { paths } from "@/lib/paths"

const LINKS = [
  { to: paths.account(), label: "Overview", end: true },
  { to: paths.accountPage("profile"), label: "Profile" },
  { to: paths.accountPage("addresses"), label: "Addresses" },
  { to: paths.accountPage("security"), label: "Security" },
  { to: paths.accountPage("notifications"), label: "Notifications" },
  { to: paths.accountPage("payments"), label: "Payments" },
  { to: paths.orders(), label: "Orders" },
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
