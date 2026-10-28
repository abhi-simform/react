import { useQuery } from "@tanstack/react-query"
import { useId } from "react"

import { Switch } from "@/components/ui/switch"
import { toApiError } from "@/lib/api/errors"

import { useUpdatePrefs } from "../hooks/useNotificationActions"
import { notificationQueries } from "../queries"
import type { NotificationCategory } from "../schemas"

const ROWS: { key: NotificationCategory; label: string; hint: string }[] = [
  {
    key: "orders",
    label: "Orders and returns",
    hint: "Status changes, refunds",
  },
  { key: "offers", label: "Offers", hint: "Deals and sales" },
  { key: "account", label: "Account", hint: "Security and profile" },
]

/** Per category: in-app and email switches. Each flips at once and rolls back if the save fails. */
export function PreferencesForm() {
  const prefs = useQuery(notificationQueries.prefs())
  const update = useUpdatePrefs()
  const id = useId()
  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="mb-2 text-lg font-medium">
        Preferences
      </h2>
      {prefs.isPending ? (
        <p role="status">Loading preferences...</p>
      ) : prefs.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {toApiError(prefs.error).message}
        </p>
      ) : (
        <table className="text-sm">
          <thead>
            <tr className="text-left">
              <th className="pr-6 font-medium">Notify me about</th>
              <th className="pr-6 font-medium">In the app</th>
              <th className="font-medium">By email</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.key}>
                <td className="py-1 pr-6">
                  {r.label}
                  <span className="block text-xs text-muted-foreground">
                    {r.hint}
                  </span>
                </td>
                {(["inApp", "email"] as const).map((channel) => (
                  <td key={channel} className="pr-6">
                    <Switch
                      aria-label={`${r.label}: ${channel === "inApp" ? "in the app" : "by email"}`}
                      checked={prefs.data[r.key][channel]}
                      onCheckedChange={(checked) =>
                        update.mutate({ [r.key]: { [channel]: checked } })
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {update.isError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          We could not save that change. Your previous setting is back.
        </p>
      )}
    </section>
  )
}
