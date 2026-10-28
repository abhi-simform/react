// 8.2: "useAuth() outside the provider throws a clear error". A separate render root
// (`renderToString`) has no providers above it, even though this component sits inside them.
import { useState } from "react"
import { renderToString } from "react-dom/server"

import { useAuth } from "@/features/auth"
import { useTheme } from "@/features/theme"
import { useWishlist } from "@/features/wishlist"

function Probe({ hook }: { hook: () => unknown }) {
  hook()
  return null
}

export function OutsideProvider() {
  const [messages, setMessages] = useState<string[]>([])
  function run() {
    const out: string[] = []
    for (const [name, hook] of [
      ["useAuth", useAuth],
      ["useTheme", useTheme],
      ["useWishlist", useWishlist],
    ] as const) {
      try {
        const Component = () => <Probe hook={hook} />
        renderToString(<Component />)
        out.push(`${name}: no error (unexpected)`)
      } catch (error) {
        out.push(`${name}: ${error instanceof Error ? error.message : error}`)
      }
    }
    setMessages(out)
  }
  return (
    <section className="grid gap-2">
      <h2 className="font-medium">Hooks outside their provider</h2>
      <button className="w-fit border p-1" onClick={run}>
        Call the hooks in a root without providers
      </button>
      <ul data-testid="outside-provider">
        {messages.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </section>
  )
}
