import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  accessTokenExpiresAt,
  devBreakAccessToken,
  useAuth,
} from "@/features/auth"
import { api } from "@/lib/api/client"

/**
 * 10.3 lab: "break" the in-memory token (as if it expired), then fire six parallel authenticated
 * requests. Open DevTools > Network and filter "auth/refresh": there must be exactly ONE refresh
 * and six successful `users/me` calls. (Needs a real session: log in first.)
 */
export default function AuthLab() {
  const { status, user } = useAuth()
  const [log, setLog] = useState<string[]>([])
  const exp = accessTokenExpiresAt()

  async function fireSix() {
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        api<{ email: string }>("/users/me", { auth: true })
      )
    )
    setLog(
      results.map(
        (r, i) =>
          `#${i + 1}: ${r.status === "fulfilled" ? "200 " + r.value.email : "failed " + String(r.reason)}`
      )
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="text-xl font-medium">Auth lab (10.3)</h1>
      <p className="text-sm">
        status {status}, user {user?.email ?? "none"}, access token expires{" "}
        {exp ? new Date(exp).toLocaleTimeString() : "(no token in memory)"}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => devBreakAccessToken()}
        >
          Invalidate access token
        </Button>
        <Button type="button" onClick={() => void fireSix()}>
          Fire 6 parallel requests
        </Button>
      </div>
      <ul className="font-mono text-xs">
        {log.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  )
}
