import { SectionBoundary } from "@/components/common/SectionBoundary"
import { Link, NavLink } from "react-router"

import { AccountMenu } from "@/features/auth"
import { CompareTrayButton } from "@/features/compare"
import { CartDrawer } from "@/features/cart"
import { NotificationBell } from "@/features/notifications"
import { ConnectionIndicator } from "@/features/realtime"
import { SearchBox } from "@/features/search"
import { LocaleSwitcher, useT } from "@/features/i18n"
import { ThemeToggle } from "@/features/theme"
import { WishlistLink } from "@/features/wishlist"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { paths } from "@/lib/paths"
import { cn } from "@/lib/utils"

import { MegaMenu } from "./MegaMenu"
import { MobileMenu } from "./MobileMenu"

/** NavLink sets `aria-current="page"` itself; the className function styles the active one. */
const navClass = ({ isActive }: { isActive: boolean }) =>
  cn("rounded px-1", isActive && "bg-muted font-medium")

export function Header() {
  const t = useT("common")
  // Only ONE of the two menus is ever in the DOM (not hidden with CSS).
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
      <div className="flex items-center gap-3">
        {!isDesktop && <MobileMenu />}
        <Link to={paths.home()} className="font-semibold">
          ShopSphere
        </Link>
        {isDesktop && (
          <SectionBoundary label="the category menu">
            <MegaMenu />
          </SectionBoundary>
        )}
      </div>
      <nav
        aria-label="Primary"
        className="flex flex-wrap items-center gap-4 text-sm"
      >
        <NavLink to={paths.products()} className={navClass} prefetch="intent">
          {t("nav.products")}
        </NavLink>
        <NavLink to={paths.deals()} className={navClass} prefetch="intent">
          {t("nav.deals")}
        </NavLink>
        <NavLink to={paths.compare()} className={navClass} prefetch="intent">
          {t("nav.compare")}
        </NavLink>
        {import.meta.env.DEV && (
          <NavLink to={paths.dev()} className={navClass}>
            Dev
          </NavLink>
        )}
        <SearchBox />
        <AccountMenu />
        <SectionBoundary label="notifications">
          <NotificationBell />
        </SectionBoundary>
        <ConnectionIndicator />
        <LocaleSwitcher />
        <ThemeToggle />
        <WishlistLink />
        <CompareTrayButton />
        <CartDrawer />
      </nav>
    </header>
  )
}
