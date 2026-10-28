import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import { describeEta } from "../format"
import type { PincodeCheckState } from "../hooks/usePincodeCheck"

/** One line under a pincode input: spinner while checking, then the human answer. `role="status"` announces it politely. */
export function PincodeStatus({
  state,
  fieldShowsError = false,
}: {
  state: PincodeCheckState
  /** The surrounding form already shows "we do not deliver" as the field's error: do not say it twice. */
  fieldShowsError?: boolean
}) {
  switch (state.status) {
    case "empty":
      return null
    case "format":
      // The format message is the field's own error (shown by the form/FormField): not repeated.
      return null
    case "checking":
      return (
        <p
          role="status"
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Loader2 aria-hidden className="size-3 animate-spin" />
          Checking delivery...
        </p>
      )
    case "unserviceable":
      if (fieldShowsError) return null
      return (
        <p role="status" className="text-xs text-destructive">
          Sorry, we do not deliver to this pincode yet.
        </p>
      )
    case "error":
      return (
        <p
          role="status"
          className="flex items-center gap-2 text-xs text-destructive"
        >
          Could not check delivery right now.
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={state.retry}
          >
            Retry
          </Button>
        </p>
      )
    case "serviceable":
      return (
        <p role="status" className="text-xs text-success">
          {describeEta(state.result)}.{" "}
          {state.result.codAvailable
            ? "Cash on delivery available."
            : "Cash on delivery is not available here."}
        </p>
      )
  }
}
