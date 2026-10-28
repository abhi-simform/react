import { useState } from "react"

import { Button } from "@/components/ui/button"
import { env } from "@/lib/env"

// Throwaway (Stage 0): fetch inside an event handler, no useEffect yet.
export function HealthBadge() {
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function ping() {
    setError(null)
    try {
      const response = await fetch(`${env.VITE_API_URL}/health`)
      const json: unknown = await response.json()
      setResult(JSON.stringify(json, null, 2))
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={ping}>Ping API</Button>
      {error && (
        <p role="alert" className="text-red-600">
          Could not reach the API: {error}
        </p>
      )}
      {result && <pre className="text-xs">{result}</pre>}
    </div>
  )
}
