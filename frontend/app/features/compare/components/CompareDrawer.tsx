import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

/**
 * Placeholder compare tray (the real one is Stage 8/11). Rarely opened, so it
 * is loaded on demand: see `LazyCompareDrawer`.
 */
export function CompareDrawer({ onClose }: { onClose: () => void }) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Compare products</SheetTitle>
          <SheetDescription>
            Nothing to compare yet. Add up to 4 products from a listing.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}
