import { Menu } from "lucide-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { useCategoryTree } from "@/features/catalog/hooks/useCategories"
import { paths } from "@/lib/paths"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

/** Below 1024px: the same links in a left drawer (focus trap + Esc come from the sheet). */
export function MobileMenu() {
  const tree = useCategoryTree()
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
        {tree.status === "success" ? (
          <ul className="flex flex-col overflow-y-auto p-4">
            {tree.data
              .flatMap((root) => [root, ...root.children])
              .map((c) => (
                <li key={c.id}>
                  <SheetClose
                    render={
                      <Link
                        to={paths.category(c.slug)}
                        className="block py-2"
                      />
                    }
                  >
                    {c.name}
                  </SheetClose>
                </li>
              ))}
          </ul>
        ) : (
          <p role="status" className="p-4">
            {tree.status === "error"
              ? "Could not load categories."
              : "Loading..."}
          </p>
        )}
      </SheetContent>
    </Sheet>
  )
}
