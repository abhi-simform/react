import { useRef } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

/**
 * Skeleton (4.5): opens with the first field focused through a ref passed to
 * base-ui's `initialFocus`. The address form and CRUD arrive in Stages 6-7.
 */
export function AddressDialog() {
  const nameRef = useRef<HTMLInputElement>(null)
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Add address
      </SheetTrigger>
      <SheetContent initialFocus={nameRef}>
        <SheetHeader>
          <SheetTitle>New address</SheetTitle>
          <SheetDescription>Where should we deliver?</SheetDescription>
        </SheetHeader>
        <form className="flex flex-col gap-2 p-4">
          <label className="flex flex-col text-sm">
            Full name
            <input ref={nameRef} className="rounded border p-1" />
          </label>
          <label className="flex flex-col text-sm">
            Street
            <input className="rounded border p-1" />
          </label>
        </form>
      </SheetContent>
    </Sheet>
  )
}
