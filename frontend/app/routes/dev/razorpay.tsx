import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  loadRazorpay,
  razorpayScriptCount,
  useRazorpay,
} from "@/features/payments"

/**
 * 11.4 lab: `checkout.js` must load ONCE however many times we ask (StrictMode double effects,
 * re-opening the modal, retries). Ten parallel `loadRazorpay()` calls share one promise and one
 * `<script>`; the hook reports the same state. This talks to checkout.razorpay.com only to fetch
 * the script: no key, no order, nothing is charged.
 */
export default function RazorpayLab() {
  const [log, setLog] = useState<string[]>([])
  const rz = useRazorpay()
  const write = (line: string) => setLog((l) => [...l, line])

  async function tenLoads() {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => loadRazorpay())
    )
    write(
      `10 parallel loads: ${results.filter((r) => r.status === "fulfilled").length} ok; script tags: ${razorpayScriptCount()}; typeof window.Razorpay: ${typeof window.Razorpay}`
    )
  }
  return (
    <div className="flex flex-col gap-2 p-4 text-sm">
      <h1 className="text-xl font-medium">checkout.js loader</h1>
      <p>
        ready: {String(rz.ready)} | error: {rz.error ?? "none"} | script tags:{" "}
        {razorpayScriptCount()}
      </p>
      <div className="flex gap-2">
        <Button onClick={() => void tenLoads()}>Load 10 times at once</Button>
        <Button variant="outline" onClick={() => rz.preload()}>
          preload() from the hook
        </Button>
      </div>
      <ul data-testid="log">
        {log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  )
}
