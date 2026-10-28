import { lazy, Suspense, useState } from "react"

import { Button } from "@/components/ui/button"

// `import()` makes the bundler emit CompareDrawer (and the Sheet code only it
// needs) as a separate chunk, fetched the first time the button is clicked.
const CompareDrawer = lazy(() =>
  import("./CompareDrawer").then((m) => ({ default: m.CompareDrawer }))
)

/** The trigger is cheap and always there; the drawer code is not downloaded until the first click. */
export function CompareTrayButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Compare tray
      </Button>
      {open && (
        <Suspense fallback={<p role="status">Loading compare tray...</p>}>
          <CompareDrawer onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
