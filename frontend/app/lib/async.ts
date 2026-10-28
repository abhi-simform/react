export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** `sleep` that rejects with the signal's reason (an AbortError) as soon as it aborts. Fake latency for stubs. */
export function abortable(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true }
    )
  })
}

/**
 * Run an abortable operation with a deadline. After `ms` the signal aborts
 * (a fetch then rejects with an AbortError). The race makes sure we also
 * reject when `run` ignores the signal.
 */
export async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  ms: number
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  const aborted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () =>
      reject(controller.signal.reason)
    )
  })
  try {
    return await Promise.race([run(controller.signal), aborted])
  } finally {
    clearTimeout(timer)
  }
}

export function isAbortError(error: unknown): boolean {
  // Duck-typed: a DOMException from another realm (jsdom, an iframe) is not `instanceof Error` here.
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  )
}
