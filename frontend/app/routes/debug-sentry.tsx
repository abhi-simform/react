// 14.6: a lab for the error pipeline (/debug/sentry; only active in a build that has a VITE_SENTRY_DSN). Every button produces ONE kind of production error so you can watch it arrive
// (Sentry when the build has a VITE_SENTRY_DSN, otherwise only the console). The PII button throws a message full
// of things that must NOT reach Sentry: `beforeSend` has to remove them. Used by scripts/verify-sentry.mjs.
import { useState } from "react"

import { api } from "@/lib/api/client"
import { reportError } from "@/lib/report"
import { noindexMeta } from "@/lib/seo"

export function meta() {
  return noindexMeta("Error pipeline lab")
}

function RenderBomb(): React.ReactNode {
  throw new Error("Deliberate render error from /debug/sentry")
}

export default function SentryLabRoute() {
  const [boom, setBoom] = useState(false)
  if (!__SENTRY_ENABLED__)
    return (
      <p className="p-4 text-sm">
        Error tracking is not enabled in this build (no VITE_SENTRY_DSN).
      </p>
    )
  if (boom) return <RenderBomb />
  return (
    <div className="p-4 text-sm">
      <h1 className="mb-2 text-xl font-medium">Error pipeline lab (14.6)</h1>
      <ul className="flex flex-col items-start gap-2">
        <li>
          <button
            type="button"
            className="rounded border px-2 py-1"
            onClick={() => setBoom(true)}
          >
            Throw during render (route boundary)
          </button>
        </li>
        <li>
          <button
            type="button"
            className="rounded border px-2 py-1"
            onClick={() => {
              throw new Error(
                "Deliberate event-handler error from /debug/sentry"
              )
            }}
          >
            Throw in an event handler (window.onerror)
          </button>
        </li>
        <li>
          <button
            type="button"
            className="rounded border px-2 py-1"
            onClick={() => {
              void Promise.reject(new Error("Deliberate unhandled rejection"))
            }}
          >
            Unhandled promise rejection
          </button>
        </li>
        <li>
          <button
            type="button"
            className="rounded border px-2 py-1"
            onClick={() => {
              api("/products/this-slug-does-not-exist").catch((e: unknown) =>
                reportError(e, "dev:failed-api-call")
              )
            }}
          >
            Failed API call (carries the request id)
          </button>
        </li>
        <li>
          <button
            type="button"
            className="rounded border px-2 py-1"
            onClick={() =>
              reportError(
                new Error(
                  "PII probe: customer@shopsphere.dev Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJlMTIzNDU at https://shop.example.com/reset-password?token=SECRET123"
                ),
                "dev:pii-probe"
              )
            }
          >
            Report an error full of PII (must be scrubbed)
          </button>
        </li>
      </ul>
    </div>
  )
}
