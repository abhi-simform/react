import { Link } from "react-router"
import { InstallButton } from "@/features/pwa"
import { paths } from "@/lib/paths"

export function Footer() {
  return (
    <footer className="mt-8 flex flex-wrap gap-4 border-t p-4 text-sm">
      <span>ShopSphere</span>
      <nav aria-label="Footer" className="flex gap-4">
        <Link to={paths.help()}>Help</Link>
        <Link to={paths.policy("returns")}>Returns</Link>
        <Link to={paths.policy("privacy")}>Privacy</Link>
        <Link to={paths.policy("terms")}>Terms</Link>
        <InstallButton />
      </nav>
    </footer>
  )
}
