import { Link } from "react-router"

import { CartDrawer } from "@/features/cart/components/CartDrawer"

export function Header() {
  return (
    <header className="flex items-center justify-between border-b p-4">
      <Link to="/" className="font-semibold">
        ShopSphere
      </Link>
      <nav aria-label="Primary" className="flex items-center gap-4 text-sm">
        <Link to="/products">Products</Link>
        <Link to="/scratch/explorer">Explorer</Link>
        <CartDrawer />
      </nav>
    </header>
  )
}
