import { Link } from "react-router"

import { CartDrawer } from "@/features/cart/components/CartDrawer"
import { SearchBox } from "@/features/search/components/SearchBox"
import { useMediaQuery } from "@/hooks/useMediaQuery"

import { MegaMenu } from "./MegaMenu"
import { MobileMenu } from "./MobileMenu"

export function Header() {
  // Only ONE of the two menus is ever in the DOM (not hidden with CSS).
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  return (
    <header className="flex items-center justify-between gap-3 border-b p-4">
      <div className="flex items-center gap-3">
        {!isDesktop && <MobileMenu />}
        <Link to="/" className="font-semibold">
          ShopSphere
        </Link>
        {isDesktop && <MegaMenu />}
      </div>
      <nav aria-label="Primary" className="flex items-center gap-4 text-sm">
        <Link to="/products">Products</Link>
        <Link to="/scratch/explorer">Explorer</Link>
        <SearchBox />
        <CartDrawer />
      </nav>
    </header>
  )
}
