import { useEffect, useState } from "react"

import { toApiError } from "@/lib/api/errors"
import { getHealth, type Health } from "@/lib/api/health"
import type { AsyncState } from "@/lib/asyncState"

/**
 * 4.1: checks `/health` once on mount. The effect synchronises the component
 * with an external system (the API). In StrictMode (dev) React mounts, runs
 * cleanup and mounts again, so the console shows two start/cleanup pairs.
 */
export function HealthBadge() {
  const [state, setState] = useState<AsyncState<Health>>({ status: "loading" })

  useEffect(() => {
    console.log("HealthBadge: effect start")
    let ignore = false // cleanup flips this: a result that arrives later is dropped
    getHealth()
      .then((data) => {
        if (!ignore) setState({ status: "success", data })
      })
      .catch((err: unknown) => {
        if (ignore) return
        setState({ status: "error", error: toApiError(err) })
      })
    return () => {
      console.log("HealthBadge: cleanup")
      ignore = true
    }
  }, [])

  switch (state.status) {
    case "success":
      return (
        <p>
          API {state.data.status}, db {state.data.db}, up {state.data.uptime}s
        </p>
      )
    case "error":
      return (
        <p role="alert" className="text-red-600">
          Could not reach the API: {state.error.message}
        </p>
      )
    default:
      return <p>Checking API...</p>
  }
}
