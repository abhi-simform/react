import { Link } from "react-router"

export function Footer() {
  return (
    <footer className="mt-8 flex flex-wrap gap-4 border-t p-4 text-sm">
      <span>ShopSphere</span>
      <nav aria-label="Footer" className="flex gap-4">
        <Link to="/help">Help</Link>
        <Link to="/policies/returns">Returns</Link>
        <Link to="/policies/privacy">Privacy</Link>
      </nav>
    </footer>
  )
}
