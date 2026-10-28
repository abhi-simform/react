import { Menu } from "lucide-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { NAV_CATEGORIES } from "./categories"

/** Below 1024px: the same links in a left drawer (focus trap + Esc come from the sheet). */
export function MobileMenu() {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="outline" size="icon" />}
        aria-label="Open menu"
      >
        <Menu aria-hidden className="size-4" />
      </SheetTrigger>
      <SheetContent side="left" data-testid="mobile-menu">
        <SheetHeader>
          <SheetTitle>Categories</SheetTitle>
        </SheetHeader>
        <ul className="flex flex-col p-4">
          {NAV_CATEGORIES.map((c) => (
            <li key={c.slug}>
              <SheetClose
                render={
                  <Link
                    to={`/products?category=${c.slug}`}
                    className="block py-2"
                  />
                }
              >
                {c.name}
              </SheetClose>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
